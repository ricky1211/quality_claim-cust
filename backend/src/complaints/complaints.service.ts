import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.module';
import { CreateComplaintDto, UpdateComplaintDto } from './complaints.dto';

type AuthUser = { id: number; role: Role; name: string };

const include = {
  customer: true,
  product: true,
  pic: { select: { id: true, name: true } },
  preparedBy: { select: { name: true } },
  checkedBy: { select: { name: true } },
  approvedBy: { select: { name: true } },
};

// Alur persetujuan: Prepared -> Checked -> Approved
const FLOW = {
  prepare: { from: 'DRAFT', to: 'PREPARED', roles: ['QC_STAFF'], by: 'preparedById', at: 'preparedAt' },
  check: { from: 'PREPARED', to: 'CHECKED', roles: ['QC_SUPERVISOR'], by: 'checkedById', at: 'checkedAt' },
  approve: { from: 'CHECKED', to: 'APPROVED', roles: ['MANAGER'], by: 'approvedById', at: 'approvedAt' },
} as const;

@Injectable()
export class ComplaintsService {
  constructor(private prisma: PrismaService) {}

  private range(year: number, month?: number) {
    return month
      ? { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) }
      : { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
  }

  list(year: number, month?: number, caseStatus?: 'OPEN' | 'CLOSED') {
    return this.prisma.complaint.findMany({
      where: { date: this.range(year, month), ...(caseStatus && { caseStatus }) },
      include,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });
  }

  private async nextDocNo(date: Date) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const count = await this.prisma.complaint.count({ where: { date: this.range(y) } });
    return `${String(count + 1).padStart(2, '0')}/QA/${String(m).padStart(2, '0')}/${y}`;
  }

  async create(dto: CreateComplaintDto) {
    const date = new Date(dto.date);
    const docNo = dto.docNo?.trim() || (await this.nextDocNo(date));
    return this.prisma.complaint.create({ data: { ...dto, docNo, date }, include });
  }

  async update(id: number, dto: UpdateComplaintDto) {
    const row = await this.get(id);
    if (row.approvalStatus !== 'DRAFT') throw new BadRequestException('Hanya dokumen berstatus Draft yang bisa diubah');
    return this.prisma.complaint.update({
      where: { id },
      data: { ...dto, ...(dto.date && { date: new Date(dto.date) }) },
      include,
    });
  }

  async get(id: number) {
    const row = await this.prisma.complaint.findUnique({ where: { id }, include });
    if (!row) throw new NotFoundException('Komplain tidak ditemukan');
    return row;
  }

  async act(id: number, action: string, user: AuthUser, note?: string) {
    const row = await this.get(id);

    if (action === 'reject') {
      if (!['PREPARED', 'CHECKED'].includes(row.approvalStatus)) throw new BadRequestException('Dokumen tidak sedang menunggu pemeriksaan');
      const allowed = row.approvalStatus === 'PREPARED' ? 'QC_SUPERVISOR' : 'MANAGER';
      if (user.role !== 'ADMIN' && user.role !== allowed) throw new ForbiddenException('Anda tidak berwenang menolak dokumen ini');
      return this.prisma.complaint.update({
        where: { id },
        data: {
          approvalStatus: 'DRAFT', rejectNote: note ?? null,
          preparedById: null, preparedAt: null, checkedById: null, checkedAt: null,
        },
        include,
      });
    }

    const step = FLOW[action as keyof typeof FLOW];
    if (!step) throw new BadRequestException('Aksi tidak dikenal');
    if (row.approvalStatus !== step.from) throw new BadRequestException(`Dokumen harus berstatus ${step.from}`);
    if (user.role !== 'ADMIN' && !(step.roles as readonly string[]).includes(user.role)) {
      throw new ForbiddenException('Peran Anda tidak berwenang melakukan aksi ini');
    }
    return this.prisma.complaint.update({
      where: { id },
      data: { approvalStatus: step.to, rejectNote: null, [step.by]: user.id, [step.at]: new Date() },
      include,
    });
  }

  async close(id: number) {
    const row = await this.get(id);
    if (row.approvalStatus !== 'APPROVED') throw new BadRequestException('Kasus hanya bisa ditutup setelah dokumen disetujui');
    return this.prisma.complaint.update({ where: { id }, data: { caseStatus: 'CLOSED' }, include });
  }

  extractChecklist(description?: string | null, approvalStatus?: string, caseStatus?: string) {
    if (description) {
      const match = description.match(/\[DOCS:(.*?)\]/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          return {
            fmea: !!parsed.fmea,
            ecn: !!parsed.ecn,
            controlPlan: !!parsed.controlPlan,
            controlSheet: !!parsed.controlSheet,
            mpsEos: !!parsed.mpsEos,
          };
        } catch {}
      }
    }
    if (approvalStatus === 'APPROVED' || caseStatus === 'CLOSED') {
      return { fmea: true, ecn: true, controlPlan: true, controlSheet: true, mpsEos: true };
    }
    if (approvalStatus === 'CHECKED') {
      return { fmea: true, ecn: true, controlPlan: true, controlSheet: true, mpsEos: false };
    }
    if (approvalStatus === 'PREPARED') {
      return { fmea: true, ecn: false, controlPlan: true, controlSheet: false, mpsEos: false };
    }
    return { fmea: false, ecn: false, controlPlan: false, controlSheet: false, mpsEos: false };
  }

  async updateChecklist(id: number, checklist: { fmea?: boolean; ecn?: boolean; controlPlan?: boolean; controlSheet?: boolean; mpsEos?: boolean }) {
    const row = await this.get(id);
    const existing = this.extractChecklist(row.description, row.approvalStatus, row.caseStatus);
    const merged = { ...existing, ...checklist };
    const cleanDesc = (row.description || '').replace(/\[DOCS:.*?\]\s*/g, '').trim();
    const newDesc = `[DOCS:${JSON.stringify(merged)}] ${cleanDesc}`.trim();

    return this.prisma.complaint.update({
      where: { id },
      data: { description: newDesc },
      include,
    });
  }

  async exportXlsx(year: number, month?: number) {
    const rows = await this.list(year, month);
    const dataRows = rows.map((r, i) => {
      let dm = '-';
      let doOp = '-';
      let actionPlan = '-';
      let docsList = '';
      let cleanDesc = (r.description || '').trim();

      const metaMatch = cleanDesc.match(/\[META:(.*?)\]/);
      if (metaMatch) {
        try {
          const parsed = JSON.parse(metaMatch[1]);
          dm = parsed.dm || '-';
          doOp = parsed.do || '-';
          actionPlan = parsed.actionPlan || '-';
        } catch {}
      }

      const docsMatch = cleanDesc.match(/\[DOCS:(.*?)\]/);
      if (docsMatch) {
        try {
          const parsed = JSON.parse(docsMatch[1]);
          const dArr: string[] = [];
          if (parsed.fmea) dArr.push('FMEA');
          if (parsed.ecn) dArr.push('ECN');
          if (parsed.controlPlan) dArr.push('CP');
          if (parsed.controlSheet) dArr.push('CS');
          if (parsed.mpsEos) dArr.push('MPS/EOS');
          docsList = dArr.join(', ') || '-';
        } catch {}
      }

      cleanDesc = cleanDesc.replace(/\[META:.*?\]\s*/g, '').replace(/\[DOCS:.*?\]\s*/g, '').trim() || '-';

      return [
        i + 1,
        r.date.toISOString().slice(0, 10),
        r.docNo,
        r.customer.name,
        r.product.partNo,
        r.product.name,
        r.defectType,
        cleanDesc,
        r.rejectQty,
        `DM: ${dm} | DO: ${doOp}`,
        `${actionPlan} (PIC: ${r.pic.name})`,
        docsList || '-',
        r.caseStatus,
        r.approvalStatus,
      ];
    });

    const sheetData = [
      ['PT MENARA TERUS MAKMUR - ASTRA OTOPARTS GROUP'],
      ['RESUME QUALITY COMPLAINT'],
      [`PERIODE: ${month ? `BULAN ${month} ${year}` : `TAHUN ${year}`}`],
      [],
      [
        'No',
        'Tanggal MTM',
        'No Register',
        'Customer',
        'Part No',
        'Nama Part',
        'Jenis Cacat',
        'Deskripsi Problem',
        'Qty Reject (pcs)',
        'Analisis Akar Masalah (DM / DO)',
        'Tindakan Perbaikan & PIC',
        'Dokumen Terkait',
        'Status Kasus',
        'Status Approval',
      ],
      ...dataRows,
      [],
      ['LEMBAR PENGESAHAN DOKUMEN (APPROVAL):'],
      ['', '', '', '', '', '', '', '', '', 'PREPARED', 'CHECKED', 'APPROVED'],
      ['', '', '', '', '', '', '', '', '', 'QC Staff', 'Supervisor QA', 'Manager QA'],
      [
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        rows[0]?.preparedBy?.name || 'PIC QA',
        rows[0]?.checkedBy?.name || 'SPV QA',
        rows[0]?.approvedBy?.name || 'MGR QA',
      ],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Merge title headers across columns A-N (0-13)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 13 } },
    ];

    // Set auto/explicit column widths to prevent cut-off in Excel
    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 14 }, // Tanggal MTM
      { wch: 18 }, // No Register
      { wch: 28 }, // Customer
      { wch: 14 }, // Part No
      { wch: 22 }, // Nama Part
      { wch: 20 }, // Jenis Cacat
      { wch: 38 }, // Deskripsi Problem
      { wch: 16 }, // Qty Reject
      { wch: 36 }, // Analisis DM / DO
      { wch: 36 }, // Tindakan Perbaikan & PIC
      { wch: 22 }, // Dokumen Terkait
      { wch: 14 }, // Status Kasus
      { wch: 16 }, // Status Approval
    ];

    XLSX.utils.book_append_sheet(wb, ws, month ? `Bulan ${month}` : `Tahun ${year}`);

    // Sheet 2: Matriks Harian Reject per Customer (1..31 & Target vs Total)
    const targetMonth = month || new Date().getMonth() + 1;
    const daysInMonth = new Date(year, targetMonth, 0).getDate();
    const dayCols = Array.from({ length: 31 }, (_, i) => String(i + 1));

    const STANDARD_CUSTOMERS = [
      { no: 1, name: 'AHM (PT. Astra Honda Motor)', matchKeys: ['ahm', 'astra honda', 'honda motor'] },
      { no: 2, name: 'DAIHATSU (PT. Astra Daihatsu Motor)', matchKeys: ['daihatsu', 'adm'] },
      { no: 3, name: 'TOYOTA (PT. Toyota Motor Manufacturing)', matchKeys: ['toyota', 'tmmin'] },
      { no: 4, name: 'HONDA (PT. Honda Prospect Motor)', matchKeys: ['honda prospect', 'hpm'] },
      { no: 5, name: 'SUZUKI (PT. Suzuki Indomobil Motor)', matchKeys: ['suzuki', 'sim'] },
      { no: 6, name: 'ISUZU (PT. Isuzu Astra Motor Indonesia)', matchKeys: ['isuzu', 'iami'] },
      { no: 7, name: 'HINO (PT. Hino Motors Manufacturing)', matchKeys: ['hino', 'hmmi'] },
      { no: 8, name: 'IGP (PT. Inti Ganda Perdana)', matchKeys: ['igp', 'inti ganda'] },
      { no: 9, name: 'AICHI (PT. Aichi Forging Indonesia)', matchKeys: ['aichi', 'afi'] },
      { no: 10, name: 'TACI (PT. Toyota Auto Body-Tokai)', matchKeys: ['taci'] },
      { no: 11, name: 'AISIN (PT. Aisin Indonesia)', matchKeys: ['aisin'] },
      { no: 12, name: 'DENSO (PT. Denso Indonesia)', matchKeys: ['denso'] },
      { no: 13, name: 'ATI (PT. AT Indonesia)', matchKeys: ['ati', 'at indonesia'] },
      { no: 14, name: 'OTICS (PT. Otics Indonesia)', matchKeys: ['otics'] },
      { no: 15, name: 'YASUNAGA (PT. Yasunaga Indonesia)', matchKeys: ['yasunaga'] },
      { no: 16, name: 'KOYAMA (PT. Koyama Casting Indonesia)', matchKeys: ['koyama'] },
      { no: 17, name: 'MITSUBISHI (PT. Mitsubishi Motors)', matchKeys: ['mitsubishi', 'mmki'] },
      { no: 18, name: 'VELASTO (PT. Velasto Indonesia)', matchKeys: ['velasto'] },
      { no: 19, name: 'M&T (PT. Menara Terus Makmur)', matchKeys: ['m&t', 'mkt', 'mt'] },
      { no: 20, name: 'FIM (PT. FIM Piston Indonesia)', matchKeys: ['fim', 'fim piston'] },
      { no: 21, name: 'KYB (PT. Kayaba Indonesia)', matchKeys: ['kayaba', 'kyb'] },
      { no: 22, name: 'PAMA (PT. Pamapersada Nusantara)', matchKeys: ['pama', 'pamapersada'] },
      { no: 23, name: 'OTHERS', matchKeys: ['others'] },
    ];

    const list = STANDARD_CUSTOMERS.map((sc) => ({
      no: sc.no,
      name: sc.name,
      days: Array(32).fill(0),
      total: 0,
    }));

    for (const r of rows) {
      const d = new Date(r.date);
      if (!month || d.getMonth() + 1 === targetMonth) {
        const day = d.getDate();
        const cName = (r.customer?.name || '').toLowerCase();
        let matchIdx = STANDARD_CUSTOMERS.findIndex((sc) =>
          sc.matchKeys.some((k) => cName.includes(k))
        );
        if (matchIdx === -1) matchIdx = list.length - 1;

        list[matchIdx].days[day] = (list[matchIdx].days[day] || 0) + (r.rejectQty || 0);
        list[matchIdx].total += r.rejectQty || 0;
      }
    }

    const matrixRows: any[] = [];
    const dailyTotals = Array(32).fill(0);
    let grandMatrixTotal = 0;

    for (const cData of list) {
      const rowArr: any[] = [cData.no, cData.name];
      for (let day = 1; day <= 31; day++) {
        const val = cData.days[day] || 0;
        rowArr.push(val > 0 ? val : '-');
        dailyTotals[day] += val;
      }
      rowArr.push(cData.total);
      grandMatrixTotal += cData.total;
      matrixRows.push(rowArr);
    }

    const targetRow: any[] = ['', 'TARGET', ...Array(31).fill(100), 100 * daysInMonth];
    const totalRow: any[] = ['', 'TOTAL HARIAN'];
    for (let day = 1; day <= 31; day++) {
      totalRow.push(dailyTotals[day]);
    }
    totalRow.push(grandMatrixTotal);

    const matrixSheetData = [
      ['PT MENARA TERUS MAKMUR - ASTRA OTOPARTS GROUP'],
      ['DAILY QUALITY COMPLAINT / REJECT MONITORING'],
      [`PERIODE: ${month ? `BULAN ${month} ${year}` : `BULAN ${targetMonth} ${year}`}`],
      [],
      ['No.', 'CUSTOMER', ...dayCols, 'TOTAL'],
      ...matrixRows,
      [],
      targetRow,
      totalRow,
      [],
      ['LEMBAR PENGESAHAN DOKUMEN (APPROVAL):'],
      ['', '', '', '', '', '', '', '', '', 'PREPARED', 'CHECKED', 'APPROVED'],
      ['', '', '', '', '', '', '', '', '', 'QC Staff', 'Supervisor QA', 'Manager QA'],
      [
        '', '', '', '', '', '', '', '', '',
        rows[0]?.preparedBy?.name || 'PIC QA',
        rows[0]?.checkedBy?.name || 'SPV QA',
        rows[0]?.approvedBy?.name || 'MGR QA',
      ],
    ];

    const wsMatrix = XLSX.utils.aoa_to_sheet(matrixSheetData);
    wsMatrix['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 32 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 32 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 32 } },
    ];
    wsMatrix['!cols'] = [
      { wch: 6 },
      { wch: 30 },
      ...Array(31).fill({ wch: 6 }),
      { wch: 10 },
    ];

    XLSX.utils.book_append_sheet(wb, wsMatrix, 'Matriks Harian Customer');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}

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
    const m = date.getMonth();
    const count = await this.prisma.complaint.count({ where: { date: this.range(y, m + 1) } });
    return `KC/${y}/${String(m + 1).padStart(2, '0')}/${String(count + 1).padStart(4, '0')}`;
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

  async exportXlsx(year: number, month?: number) {
    const rows = await this.list(year, month);
    const data = rows.map((r, i) => ({
      No: i + 1,
      Tanggal: r.date.toISOString().slice(0, 10),
      'No Dokumen': r.docNo,
      Customer: r.customer.name,
      'Part No': r.product.partNo,
      Produk: r.product.name,
      'Jenis Cacat': r.defectType,
      'Qty Reject': r.rejectQty,
      PIC: r.pic.name,
      'Status Kasus': r.caseStatus,
      Prepared: r.preparedBy?.name ?? '',
      Checked: r.checkedBy?.name ?? '',
      Approved: r.approvedBy?.name ?? '',
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), month ? `Bulan ${month}` : `Tahun ${year}`);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}

'use client';
import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, session, MONTHS, fmtDate, fmtRp, yearOptions } from '@/lib/api';
import { Badge } from '@/components/ui';

function ReportViewWatcher({ onView }: { onView: (view: string | null) => void }) {
  const searchParams = useSearchParams();
  const v = searchParams.get('view');
  useEffect(() => {
    onView(v);
  }, [v, onView]);
  return null;
}
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

export default function ReportsPage() {
  const user = session.user();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(10); // Default ke bulan Oktober (atau bulan terpilih)
  const [rows, setRows] = useState<any[]>([]);
  const [masterCustomers, setMasterCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOfficialHeader, setShowOfficialHeader] = useState(false);
  const [reportView, setReportView] = useState<'matrix' | 'resume' | 'both'>('both');
  const [targetPcs, setTargetPcs] = useState(100); // Garis target harian (default: 100 pcs)

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [complaintsData, custsData] = await Promise.all([
        api.get(`/complaints?year=${year}${month ? `&month=${month}` : ''}`),
        api.get('/master/customers').catch(() => []),
      ]);
      setRows(complaintsData || []);
      setMasterCustomers(custsData || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Bulan aktif untuk perhitungan matriks harian (1-12)
  const activeMonth = month > 0 ? month : new Date().getMonth() + 1;
  const daysInActiveMonth = new Date(year, activeMonth, 0).getDate();
  const dayNumbers = Array.from({ length: 31 }, (_, i) => i + 1);

  // Parse structured metadata from description if present
  function parseMetadata(desc: string | null) {
    if (!desc) return {};
    const metaMatch = desc.match(/\[META:(.*?)\]/);
    if (metaMatch) {
      try {
        return JSON.parse(metaMatch[1]);
      } catch {}
    }
    const docsMatch = desc.match(/\[DOCS:(.*?)\]/);
    if (docsMatch) {
      try {
        return { docs: JSON.parse(docsMatch[1]) };
      } catch {}
    }
    return {};
  }

  function getCleanDesc(desc: string | null) {
    if (!desc) return '-';
    return desc.replace(/\[META:.*?\]\s*/g, '').replace(/\[DOCS:.*?\]\s*/g, '').trim() || '-';
  }

const STANDARD_CUSTOMERS = [
  { no: 1, id: 'ahm', shortName: 'AHM', name: 'PT. Astra Honda Motor', logo: '/asset/ASTA-HONDA-MOTOR.png', matchKeys: ['ahm', 'astra honda', 'honda motor'] },
  { no: 2, id: 'daihatsu', shortName: 'DAIHATSU', name: 'PT. Astra Daihatsu Motor', logo: '/asset/DAIHATSU.png', matchKeys: ['daihatsu', 'adm'] },
  { no: 3, id: 'toyota', shortName: 'TOYOTA', name: 'PT. Toyota Motor Manufacturing Indonesia', logo: '/asset/TOYOTA.png', matchKeys: ['toyota', 'tmmin'] },
  { no: 4, id: 'honda', shortName: 'HONDA', name: 'PT. Honda Prospect Motor', logo: '/asset/HONDA.png', matchKeys: ['honda prospect', 'hpm'] },
  { no: 5, id: 'suzuki', shortName: 'SUZUKI', name: 'PT. Suzuki Indomobil Motor', logo: '/asset/SUZUKI.png', matchKeys: ['suzuki', 'sim'] },
  { no: 6, id: 'isuzu', shortName: 'ISUZU', name: 'PT. Isuzu Astra Motor Indonesia', logo: '/asset/ISUZU.png', matchKeys: ['isuzu', 'iami'] },
  { no: 7, id: 'hino', shortName: 'HINO', name: 'PT. Hino Motors Manufacturing Indonesia', logo: '/asset/HINO.png', matchKeys: ['hino', 'hmmi'] },
  { no: 8, id: 'igp', shortName: 'IGP', name: 'PT. Inti Ganda Perdana', logo: '/asset/INTI-GANDA-PERDANA.png', matchKeys: ['igp', 'inti ganda'] },
  { no: 9, id: 'aichi', shortName: 'AICHI', name: 'PT. Aichi Forging Indonesia', logo: '/asset/AICHI-FORGING-INDONESIA.png', matchKeys: ['aichi', 'afi'] },
  { no: 10, id: 'taci', shortName: 'TACI', name: 'PT. Toyota Auto Body-Tokai', logo: '/asset/TACI.png', matchKeys: ['taci'] },
  { no: 11, id: 'aisin', shortName: 'AISIN', name: 'PT. Aisin Indonesia', logo: '/asset/AISIN.png', matchKeys: ['aisin'] },
  { no: 12, id: 'denso', shortName: 'DENSO', name: 'PT. Denso Indonesia', logo: '/asset/DENSO.png', matchKeys: ['denso'] },
  { no: 13, id: 'ati', shortName: 'ATI', name: 'PT. AT Indonesia', logo: '/asset/ATI.png', matchKeys: ['ati', 'at indonesia'] },
  { no: 14, id: 'otics', shortName: 'OTICS', name: 'PT. Otics Indonesia', logo: '/asset/OTICS-INDONESIA.png', matchKeys: ['otics'] },
  { no: 15, id: 'yasunaga', shortName: 'YASUNAGA', name: 'PT. Yasunaga Indonesia', logo: '/asset/YASUNAGA.png', matchKeys: ['yasunaga'] },
  { no: 16, id: 'koyama', shortName: 'KOYAMA', name: 'PT. Koyama Casting Indonesia', logo: '/asset/KOYAMA.png', matchKeys: ['koyama'] },
  { no: 17, id: 'mitsubishi', shortName: 'MITSUBISHI', name: 'PT. Mitsubishi Motors', logo: '/asset/MITSUBISHI-MOTORS.png', matchKeys: ['mitsubishi', 'mmki'] },
  { no: 18, id: 'velasto', shortName: 'VELASTO', name: 'PT. Velasto Indonesia', logo: '/asset/VELASTO.png', matchKeys: ['velasto'] },
  { no: 19, id: 'mt', shortName: 'M&T', name: 'PT. Menara Terus Makmur (M&T)', logo: '/asset/MT.png', matchKeys: ['m&t', 'mkt', 'mt'] },
  { no: 20, id: 'fim', shortName: 'FIM', name: 'PT. FIM Piston Indonesia', logo: '/asset/FIM-PISTON.png', matchKeys: ['fim', 'fim piston'] },
  { no: 21, id: 'kyb', shortName: 'KYB', name: 'PT. Kayaba Indonesia', logo: '/asset/KYB.png', matchKeys: ['kayaba', 'kyb'] },
  { no: 22, id: 'pama', shortName: 'PAMA', name: 'PT. Pamapersada Nusantara', logo: '/asset/PAMA.png', matchKeys: ['pama', 'pamapersada'] },
  { no: 23, id: 'others', shortName: 'OTHERS', name: 'OTHERS (Customer Lainnya)', logo: null, matchKeys: ['others'] },
];

  // 1. Data Matriks Harian Reject per Customer (1..31)
  const { customerRows, dailyTotals, grandMatrixTotal, chartData, maxDailyVal } = useMemo(() => {
    // Inisialisasi 23 customer tetap sesuai standar template resmi
    const list = STANDARD_CUSTOMERS.map((sc) => ({
      no: sc.no,
      id: sc.id,
      name: sc.name,
      shortName: sc.shortName,
      logo: sc.logo,
      days: Array(32).fill(0),
      total: 0,
    }));

    // Petakan setiap komplain ke baris customer standar yang sesuai
    rows.forEach((r) => {
      const d = new Date(r.date);
      const m = d.getMonth() + 1;
      if (m === activeMonth) {
        const day = d.getDate();
        const cName = (r.customer?.name || '').toLowerCase();

        let matchIdx = STANDARD_CUSTOMERS.findIndex((sc) =>
          sc.matchKeys.some((k) => cName.includes(k))
        );
        if (matchIdx === -1) {
          matchIdx = list.length - 1; // OTHERS
        }

        list[matchIdx].days[day] = (list[matchIdx].days[day] || 0) + (r.rejectQty || 0);
        list[matchIdx].total += r.rejectQty || 0;
      }
    });

    // Array harian total reject across all customers
    const dailySums = Array(32).fill(0);
    let grandTotal = 0;

    list.forEach((cust) => {
      for (let day = 1; day <= 31; day++) {
        dailySums[day] += cust.days[day] || 0;
      }
      grandTotal += cust.total;
    });

    // Chart dataset untuk 31 hari
    let maxVal = targetPcs;
    const cData = dayNumbers.map((day) => {
      const val = dailySums[day] || 0;
      if (val > maxVal) maxVal = val;
      return {
        day: String(day),
        dayNum: day,
        reject: val,
        target: targetPcs,
      };
    });

    return {
      customerRows: list,
      dailyTotals: dailySums,
      grandMatrixTotal: grandTotal,
      chartData: cData,
      maxDailyVal: maxVal,
    };
  }, [rows, activeMonth, targetPcs]);

  const totalReject = rows.reduce((s, r) => s + (r.rejectQty || 0), 0);
  const totalOpen = rows.filter((r) => r.caseStatus === 'OPEN').length;
  const totalClosed = rows.filter((r) => r.caseStatus === 'CLOSED').length;
  const overTargetDays = chartData.filter((d) => d.reject > targetPcs).length;

  function handlePrintPdf() {
    window.print();
  }

  function handleExportExcel() {
    api.download(
      `/complaints/export?year=${year}${month ? `&month=${month}` : ''}`,
      `Resume-Complaint-${year}${month ? '-' + month : ''}.xlsx`
    );
  }

  const handleView = useCallback((v: string | null) => {
    if (v === 'matrix') setReportView('matrix');
    else if (v === 'resume') setReportView('resume');
  }, []);

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <ReportViewWatcher onView={handleView} />
      </Suspense>
      {/* Top Controls: Filter & Export (Hidden when printing) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tahun:</span>
            <select
              aria-label="Tahun Laporan"
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={year}
              onChange={(e) => setYear(+e.target.value)}
            >
              {yearOptions().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bulan:</span>
            <select
              aria-label="Bulan Laporan"
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              value={month}
              onChange={(e) => setMonth(+e.target.value)}
            >
              <option value={0}>Semua Bulan (Jan - Des)</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle View Mode */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setReportView('matrix')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                reportView === 'matrix' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <span>Matriks & Tren Harian</span>
            </button>
            <button
              type="button"
              onClick={() => setReportView('resume')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                reportView === 'resume' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Tabel Resume</span>
            </button>
            <button
              type="button"
              onClick={() => setReportView('both')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                reportView === 'both' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua (Lengkap)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Target input quick setter */}
          <div className="flex items-center gap-1 text-xs bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Target:</span>
            <input
              type="number"
              value={targetPcs}
              onChange={(e) => setTargetPcs(Math.max(1, +e.target.value))}
              className="w-12 bg-white border border-slate-300 rounded px-1 text-center font-bold text-rose-600 text-xs"
              title="Target Reject Harian (Pcs)"
            />
            <span className="text-[10px] text-slate-400">pcs</span>
          </div>

          <button
            type="button"
            onClick={() => setShowOfficialHeader((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              showOfficialHeader
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
            title="Tampilkan / sembunyikan kop surat & tanda tangan resmi di layar"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>{showOfficialHeader ? 'Sembunyikan Kop' : 'Lihat Format Cetak'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 text-white shadow-sm transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Export PDF / Cetak</span>
          </button>
        </div>
      </div>

      {/* Official Document Sheet */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full space-y-6">
        {/* On-screen Title & Summary Bar (hidden when printing or when official letterhead is previewed) */}
        {!showOfficialHeader && (
          <div className="print:hidden flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                {reportView === 'matrix'
                  ? 'DAILY QUALITY COMPLAINT / REJECT MONITORING'
                  : reportView === 'resume'
                  ? 'RESUME QUALITY COMPLAINT'
                  : 'LAPORAN MUTU KOMPLAIN & REKAP HARIAN REJECT'}
              </h2>
              <p className="text-xs text-slate-500">
                Periode: {MONTHS[activeMonth - 1]} {year} | Target Harian: {targetPcs} pcs
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-medium">
                Total Komplain: <strong className="font-bold">{rows.length}</strong> Kasus
              </span>
              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-medium">
                Total Reject: <strong className="font-bold">{grandMatrixTotal.toLocaleString('id-ID')}</strong> pcs
              </span>
              <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-medium">
                Hari Melebihi Target: <strong className="font-bold">{overTargetDays}</strong> Hari
              </span>
            </div>
          </div>
        )}

        {/* Header Resmi Perusahaan & Blok Tanda Tangan (Dimunculkan otomatis saat Cetak/PDF, atau jika diklik preview) */}
        <div className={`${showOfficialHeader ? 'block' : 'hidden print:block'} border border-slate-300 print:border-slate-500 mb-5 print:mb-2.5 print:w-full`}>
          <div className="grid grid-cols-12 divide-x divide-slate-300 print:divide-slate-500">
            {/* Logo & Info Perusahaan */}
            <div className="col-span-3 p-3 print:p-1.5 flex flex-col justify-center items-center text-center">
              <img
                src="/asset/logo-mtm.jpg"
                alt="PT Menara Terus Makmur"
                className="h-10 print:h-8 w-auto object-contain mb-1"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/asset/logo-mtm-icon.png';
                }}
              />
              <p className="text-[10px] print:text-[8.5px] font-bold text-slate-800">PT MENARA TERUS MAKMUR</p>
              <p className="text-[9px] print:text-[7.5px] text-slate-500">Astra Otoparts Group</p>
            </div>

            {/* Judul Dokumen */}
            <div className="col-span-5 p-3 print:p-1.5 flex flex-col justify-center items-center text-center">
              <h2 className="text-sm sm:text-base print:text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                {reportView === 'resume'
                  ? 'RESUME QUALITY COMPLAINT'
                  : 'DAILY QUALITY COMPLAINT / REJECT MONITORING'}
              </h2>
              <p className="text-xs print:text-[9.5px] font-semibold text-slate-600 mt-1 print:mt-0.5">
                PERIODE: {MONTHS[activeMonth - 1].toUpperCase()} {year}
              </p>
              <p className="text-[10px] print:text-[8px] text-slate-400 mt-0.5">
                Total: {rows.length} Kasus | Reject: {grandMatrixTotal.toLocaleString('id-ID')} pcs | Target: {targetPcs} pcs/hari
              </p>
            </div>

            {/* Blok Tanda Tangan Persetujuan Berjenjang */}
            <div className="col-span-4 grid grid-cols-3 divide-x divide-slate-300 print:divide-slate-500 text-center text-[10px] print:text-[8px]">
              <div className="flex flex-col justify-between p-1.5 print:p-1 bg-slate-50/50 print:bg-white">
                <span className="font-bold text-slate-600 border-b border-slate-200 print:border-slate-400 pb-1 print:pb-0.5">PREPARED</span>
                <div className="py-4 print:py-1.5 font-semibold text-slate-800 text-[11px] print:text-[9px]">
                  {rows[0]?.preparedBy?.name || 'PIC QA'}
                </div>
                <span className="text-[9px] print:text-[7.5px] text-slate-400">QC Staff</span>
              </div>
              <div className="flex flex-col justify-between p-1.5 print:p-1 bg-slate-50/50 print:bg-white">
                <span className="font-bold text-slate-600 border-b border-slate-200 print:border-slate-400 pb-1 print:pb-0.5">CHECKED</span>
                <div className="py-4 print:py-1.5 font-semibold text-slate-800 text-[11px] print:text-[9px]">
                  {rows[0]?.checkedBy?.name || 'SPV QA'}
                </div>
                <span className="text-[9px] print:text-[7.5px] text-slate-400">Supervisor QA</span>
              </div>
              <div className="flex flex-col justify-between p-1.5 print:p-1 bg-slate-50/50 print:bg-white">
                <span className="font-bold text-slate-600 border-b border-slate-200 print:border-slate-400 pb-1 print:pb-0.5">APPROVED</span>
                <div className="py-4 print:py-1.5 font-semibold text-slate-800 text-[11px] print:text-[9px]">
                  {rows[0]?.approvedBy?.name || 'MGR QA'}
                </div>
                <span className="text-[9px] print:text-[7.5px] text-slate-400">Manager QA</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FITUR 1: GRAFIK TREN HARIAN & MATRIKS DISTRIBUSI REJECT PER CUSTOMER      */}
        {/* ========================================================================= */}
        {(reportView === 'matrix' || reportView === 'both') && (
          <div className="space-y-4">
            {/* 1.1 Line Chart: Daily Reject (PCS) vs Target (100) */}
            <div className="border border-slate-300 rounded-lg p-3 bg-white print:border-slate-500">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Grafik Tren Harian Reject Qty vs Target (Bulan {MONTHS[activeMonth - 1]} {year})
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    [ Satuan: PCS ]
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-blue-600">
                    <span className="inline-block w-3 h-0.5 bg-blue-600"></span>
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-600"></span>
                    <span>Realisasi Reject (PCS)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-600">
                    <span className="inline-block w-4 h-0.5 bg-rose-600"></span>
                    <span>Target ({targetPcs} PCS)</span>
                  </div>
                </div>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="dayNum"
                      ticks={dayNumbers}
                      tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }}
                      interval={0}
                    />
                    <YAxis
                      domain={[0, (dataMax: number) => Math.max(150, Math.ceil((dataMax || 100) * 1.2 / 50) * 50)]}
                      tick={{ fontSize: 9, fill: '#64748B' }}
                      label={{
                        value: 'PCS',
                        angle: -90,
                        position: 'insideLeft',
                        fontSize: 10,
                        fill: '#475569',
                        fontWeight: 'bold',
                        offset: 15,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '11px',
                        padding: '6px 10px',
                      }}
                      formatter={(val: any, name: string) => [
                        `${Number(val).toLocaleString('id-ID')} pcs`,
                        name === 'reject' ? 'Realisasi Reject' : 'Target Harian',
                      ]}
                      labelFormatter={(lbl: any) => `Tanggal: ${lbl} ${MONTHS[activeMonth - 1]} ${year}`}
                    />
                    <ReferenceLine
                      y={targetPcs}
                      stroke="#EF4444"
                      strokeWidth={1.5}
                      label={{
                        value: `TARGET: ${targetPcs}`,
                        position: 'insideTopRight',
                        fill: '#DC2626',
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="reject"
                      name="reject"
                      stroke="#2563EB"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#2563EB', stroke: '#1E40AF', strokeWidth: 1 }}
                      activeDot={{ r: 5, fill: '#1D4ED8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 1.2 Matriks Harian Customer (Tabel Distribusi Hari 1..31 & Target vs Total) */}
            <div className="overflow-x-auto print:overflow-visible border border-slate-300 print:border-slate-500 rounded-lg print:rounded-none">
              <table className="w-full text-center text-xs print:text-[8px] print:leading-tight border-collapse">
                <thead>
                  <tr className="bg-blue-600 text-white font-bold uppercase text-[10px] print:text-[7.5px]">
                    <th className="py-1.5 px-1 border border-blue-500 w-8 text-center">No</th>
                    <th className="py-1.5 px-2 border border-blue-500 w-28 text-center uppercase tracking-wider">CUST</th>
                    {dayNumbers.map((d) => (
                      <th
                        key={d}
                        className={`py-1 px-0.5 border border-blue-500 w-6 text-center ${
                          d > daysInActiveMonth ? 'bg-blue-800 text-blue-300' : ''
                        }`}
                      >
                        {d}
                      </th>
                    ))}
                    <th className="py-1 px-2 border border-blue-500 w-16 text-center bg-blue-800 text-white font-black">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customerRows.map((cust) => (
                    <tr
                      key={cust.no}
                      className="odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/60 transition-colors"
                    >
                      <td className="py-1 px-1 text-center font-bold text-slate-800 border border-slate-300 text-[11px] print:text-[8px]">
                        {cust.no}
                      </td>
                      <td
                        className="py-0.5 px-1 text-center border border-slate-300 bg-white"
                        title={cust.name}
                      >
                        <div className="flex items-center justify-center min-h-[26px] max-h-[30px]">
                          {cust.logo ? (
                            <img
                              src={cust.logo}
                              alt={cust.shortName}
                              className="h-6 max-h-6 w-auto max-w-[85px] object-contain mx-auto"
                            />
                          ) : (
                            <span className="font-extrabold text-[11px] text-slate-800 tracking-wider">
                              {cust.shortName}
                            </span>
                          )}
                        </div>
                      </td>

                      {dayNumbers.map((day) => {
                        const val = cust.days[day] || 0;
                        const isBeyondMonth = day > daysInActiveMonth;
                        const isHighlight = val > 0;
                        const isOverTarget = val >= targetPcs;

                        return (
                          <td
                            key={day}
                            className={`py-1 px-0.5 border border-slate-300 text-center font-mono text-[10px] print:text-[7.5px] tabular-nums ${
                              isBeyondMonth
                                ? 'bg-slate-100 text-slate-300'
                                : isOverTarget
                                ? 'bg-blue-600 text-white font-black'
                                : isHighlight
                                ? 'bg-blue-100 text-blue-900 font-extrabold border-blue-300'
                                : 'text-slate-300 font-light'
                            }`}
                          >
                            {isBeyondMonth ? '' : val > 0 ? val : '·'}
                          </td>
                        );
                      })}

                      <td
                        className={`py-1 px-1.5 text-center font-mono font-black border border-slate-300 text-[11px] print:text-[8px] ${
                          cust.total > 0 ? 'bg-blue-50 text-blue-800' : 'text-slate-400'
                        }`}
                      >
                        {cust.total > 0 ? cust.total.toLocaleString('id-ID') : '-'}
                      </td>
                    </tr>
                  ))}

                  {/* Baris TARGET */}
                  <tr className="bg-blue-50/70 font-bold text-blue-800 border-t-2 border-blue-300 text-[10px] print:text-[7.5px]">
                    <td className="py-1 px-1 text-center border border-slate-300"></td>
                    <td className="py-1 px-2 text-left font-black tracking-wider border border-slate-300 text-blue-900">
                      TARGET
                    </td>
                    {dayNumbers.map((d) => (
                      <td
                        key={d}
                        className={`py-1 px-0.5 text-center border border-slate-300 font-mono text-[9px] print:text-[7px] ${
                          d > daysInActiveMonth ? 'text-slate-300' : 'text-blue-700'
                        }`}
                      >
                        {d <= daysInActiveMonth ? targetPcs : ''}
                      </td>
                    ))}
                    <td className="py-1 px-1.5 text-center font-black border border-slate-300 text-blue-900">
                      {(targetPcs * daysInActiveMonth).toLocaleString('id-ID')}
                    </td>
                  </tr>

                  {/* Baris TOTAL HARIAN */}
                  <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-400 text-[11px] print:text-[8px]">
                    <td className="py-1 px-1 text-center border border-slate-300"></td>
                    <td className="py-1 px-2 text-left tracking-wider uppercase border border-slate-300 text-slate-800">
                      TOTAL HARIAN
                    </td>
                    {dayNumbers.map((d) => {
                      const val = dailyTotals[d] || 0;
                      const isBeyond = d > daysInActiveMonth;
                      const isOver = val >= targetPcs;

                      return (
                        <td
                          key={d}
                          className={`py-1 px-0.5 text-center border border-slate-300 font-mono tabular-nums ${
                            isBeyond
                              ? 'text-slate-300'
                              : isOver
                              ? 'bg-blue-600 text-white font-black'
                              : val > 0
                              ? 'bg-blue-100 text-blue-900 font-black'
                              : 'text-slate-400 font-normal'
                          }`}
                        >
                          {isBeyond ? '' : val > 0 ? val : '0'}
                        </td>
                      );
                    })}
                    <td className="py-1 px-1.5 text-center font-black bg-blue-700 text-white border border-blue-800">
                      {grandMatrixTotal.toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FITUR 2: TABEL RESUME DETAIL KOMPLAIN (DOKUMEN & TINDAKAN PERBAIKAN)      */}
        {/* ========================================================================= */}
        {(reportView === 'resume' || reportView === 'both') && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Tabel Rincian Resume Komplain Pelanggan
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Total: <strong>{rows.length}</strong> Kasus
              </span>
            </div>

            <div className="overflow-x-auto print:overflow-visible border border-slate-300 print:border-slate-500 rounded-lg print:rounded-none">
              <table className="w-full text-left text-xs print:text-[8px] print:leading-tight border-collapse">
                <thead>
                  <tr className="bg-blue-600 text-white text-[11px] print:text-[8px] font-bold uppercase print:bg-blue-700">
                    <th className="py-1.5 px-2 print:py-1 print:px-1 text-center w-8 print:w-5 border border-blue-500">No</th>
                    <th className="py-1.5 px-2 print:py-1 print:px-1 whitespace-nowrap border border-blue-500">Tgl MTM</th>
                    <th className="py-1.5 px-2 print:py-1 print:px-1 whitespace-nowrap border border-blue-500">No Register</th>
                    <th className="py-1.5 px-2 print:py-1 print:px-1 border border-blue-500">Customer</th>
                    <th className="py-1.5 px-2 print:py-1 print:px-1 border border-blue-500">Part Name & Number</th>
                    <th className="py-1.5 px-2 print:py-1 print:px-1 border border-blue-500">Deskripsi Problem</th>
                    <th className="py-1.5 px-2 print:py-1 print:px-1 text-right whitespace-nowrap border border-blue-500">Reject</th>
                    <th className="py-1.5 px-2 print:py-1 print:px-1 border border-blue-500">Analisis (DM / DO)</th>
                    <th className="py-1.5 px-2 print:py-1 print:px-1 border border-blue-500">Tindakan Perbaikan</th>
                    <th className="py-1.5 px-2 print:py-1 print:px-1 text-center whitespace-nowrap border border-blue-500">Dokumen</th>
                    <th className="py-1.5 px-2 print:py-1 print:px-1 text-center whitespace-nowrap border border-blue-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400 border border-slate-200 print:border-slate-400">
                        Memuat data rekapitulasi…
                      </td>
                    </tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400 border border-slate-200 print:border-slate-400">
                        Tidak ada rekaman data komplain untuk periode ini.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    rows.map((r, i) => {
                      const meta = parseMetadata(r.description);
                      const docs = meta.docs || {};
                      const cleanDesc = getCleanDesc(r.description);

                      return (
                        <tr key={r.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/50 transition-colors print:even:bg-white">
                          <td className="py-1.5 px-2 print:py-1 print:px-0.5 text-center text-slate-500 font-bold border border-slate-200 print:border-slate-400">{i + 1}</td>
                          <td className="py-1.5 px-2 print:py-1 print:px-1 whitespace-nowrap text-slate-700 border border-slate-200 print:border-slate-400">{fmtDate(r.date)}</td>
                          <td className="py-1.5 px-2 print:py-1 print:px-1 font-bold text-slate-900 font-mono whitespace-nowrap border border-slate-200 print:border-slate-400">{r.docNo}</td>
                          <td className="py-1.5 px-2 print:py-1 print:px-1 font-semibold text-slate-800 border border-slate-200 print:border-slate-400">{r.customer?.name}</td>
                          <td className="py-1.5 px-2 print:py-1 print:px-1 border border-slate-200 print:border-slate-400">
                            <div className="font-semibold text-slate-900 print:text-[8px]">{r.product?.name}</div>
                            <div className="text-[10px] print:text-[7.5px] text-slate-500 font-mono">{r.product?.partNo}</div>
                          </td>
                          <td className="py-1.5 px-2 print:py-1 print:px-1 max-w-xs print:max-w-none border border-slate-200 print:border-slate-400">
                            <div className="font-medium text-slate-800 print:text-[8px]">{r.defectType}</div>
                            <div className="text-[11px] print:text-[7.5px] text-slate-500 truncate print:overflow-visible print:whitespace-normal">{cleanDesc}</div>
                          </td>
                          <td className="py-1.5 px-2 print:py-1 print:px-1 text-right font-bold text-slate-900 tabular-nums border border-slate-200 print:border-slate-400">
                            {r.rejectQty?.toLocaleString('id-ID')}
                          </td>
                          <td className="py-1.5 px-2 print:py-1 print:px-1 max-w-xs print:max-w-none text-[11px] print:text-[7.5px] text-slate-600 border border-slate-200 print:border-slate-400">
                            {meta.dm && <div><strong className="text-slate-700">DM:</strong> {meta.dm}</div>}
                            {meta.do && <div><strong className="text-slate-700">DO:</strong> {meta.do}</div>}
                            {!meta.dm && !meta.do && <span className="text-slate-400">-</span>}
                          </td>
                          <td className="py-1.5 px-2 print:py-1 print:px-1 max-w-xs print:max-w-none text-[11px] print:text-[7.5px] text-slate-600 border border-slate-200 print:border-slate-400">
                            {meta.actionPlan ? (
                              <div>
                                <div>{meta.actionPlan}</div>
                                <div className="text-[10px] print:text-[7px] text-slate-400">PIC: {r.pic?.name || '-'}</div>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 print:py-1 print:px-0.5 text-center whitespace-nowrap border border-slate-200 print:border-slate-400">
                            <div className="flex items-center justify-center gap-0.5 text-[9px] print:text-[7px] font-mono">
                              <span className={`px-1 py-0.5 rounded ${docs.fmea ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-400'}`}>FMEA</span>
                              <span className={`px-1 py-0.5 rounded ${docs.ecn ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-400'}`}>ECN</span>
                              <span className={`px-1 py-0.5 rounded ${docs.controlPlan ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-400'}`}>CP</span>
                              <span className={`px-1 py-0.5 rounded ${docs.controlSheet ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-400'}`}>CS</span>
                            </div>
                          </td>
                          <td className="py-1.5 px-2 print:py-1 print:px-0.5 text-center whitespace-nowrap border border-slate-200 print:border-slate-400">
                            <Badge value={r.caseStatus} />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

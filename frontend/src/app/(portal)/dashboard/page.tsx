'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, fmtRp, fmtDate, MONTHS, yearOptions } from '@/lib/api';
import { Modal } from '@/components/ui';

const STATUS_TONE: Record<string, { bg: string; label: string }> = {
  DRAFT: { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Draft' },
  PREPARED: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Hold' },
  CHECKED: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Progress' },
  APPROVED: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Approved' },
  OPEN: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Open' },
  CLOSED: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Closed' },
};

const CUSTOMER_COLORS = ['#2563EB', '#0D9488', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B'];

export default function DashboardPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number>(0);
  const [category, setCategory] = useState<'ALL' | 'FG' | 'NON_FORGING'>('ALL');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  const [tableSearch, setTableSearch] = useState('');
  const [tableFilter, setTableFilter] = useState<'ALL' | 'HOLD' | 'IN_PROGRESS'>('ALL');

  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [editingChecklist, setEditingChecklist] = useState<any>(null);
  const [savingChecklist, setSavingChecklist] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = () => {
    setLoading(true);
    setError('');

    const query = new URLSearchParams();
    query.set('year', String(year));
    if (month > 0) query.set('month', String(month));
    if (category !== 'ALL') query.set('category', category);

    api
      .get(`/dashboard?${query.toString()}`)
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [year, month, category]);

  const openChecklistModal = (item: any) => {
    setSelectedComplaint(item);
    setEditingChecklist({ ...item.checklist });
  };

  const handleSaveChecklist = async () => {
    if (!selectedComplaint) return;
    setSavingChecklist(true);
    try {
      await api.patch(`/complaints/${selectedComplaint.id}/checklist`, editingChecklist);
      setSelectedComplaint(null);
      loadData();
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSavingChecklist(false);
    }
  };

  const filteredOpenComplaints = useMemo(() => {
    if (!data?.openComplaints) return [];
    return data.openComplaints.filter((c: any) => {
      if (tableFilter === 'HOLD' && !['DRAFT', 'PREPARED'].includes(c.approvalStatus)) return false;
      if (tableFilter === 'IN_PROGRESS' && c.approvalStatus !== 'CHECKED') return false;

      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const docNo = (c.docNo || '').toLowerCase();
        const customer = (c.customer?.name || '').toLowerCase();
        const product = (c.product?.name || '').toLowerCase();
        const defect = (c.defectType || '').toLowerCase();
        const pic = (c.pic?.name || '').toLowerCase();
        return docNo.includes(q) || customer.includes(q) || product.includes(q) || defect.includes(q) || pic.includes(q);
      }
      return true;
    });
  }, [data?.openComplaints, tableFilter, tableSearch]);

  const paretoTotal = useMemo(() => {
    if (!data?.pareto || data.pareto.length === 0) return 100;
    return data.pareto.reduce((s: number, p: any) => s + (p.rejectQty || 0), 0) || 100;
  }, [data?.pareto]);

  if (!mounted) return null;

  return (
    <div className="h-full flex flex-col gap-2 min-h-0 overflow-hidden">
      {/* 1. Global Filter Bar (Compact & Minimal) */}
      <div className="flex-shrink-0 flex items-center justify-end gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          {/* Tahun */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              className="h-7 w-6 rounded-l-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-xs font-bold"
            >
              ‹
            </button>
            <select
              value={year}
              onChange={(e) => setYear(+e.target.value)}
              className="h-7 border-y border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
            >
              {yearOptions().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              className="h-7 w-6 rounded-r-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-xs font-bold"
            >
              ›
            </button>
          </div>

          {/* Bulan */}
          <select
            value={month}
            onChange={(e) => setMonth(+e.target.value)}
            className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
          >
            <option value={0}>Semua</option>
            {MONTHS.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>

          {/* Kategori Klaim */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setCategory('ALL')}
              className={`h-6 px-2 text-[11px] font-bold rounded ${
                category === 'ALL' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setCategory('FG')}
              className={`h-6 px-2 text-[11px] font-bold rounded ${
                category === 'FG' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              FG
            </button>
            <button
              type="button"
              onClick={() => setCategory('NON_FORGING')}
              className={`h-6 px-2 text-[11px] font-bold rounded ${
                category === 'NON_FORGING' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Non-Forging
            </button>
          </div>

          <button
            type="button"
            onClick={loadData}
            title="Refresh"
            className="h-7 w-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-50"
          >
            <svg className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex-shrink-0 bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1 rounded-lg text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="font-bold underline ml-2">Ulangi</button>
        </div>
      )}

      {loading && !data ? (
        <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
          Memuat...
        </div>
      ) : data ? (
        <>
          {/* 2. Key Performance Indicators (Minimalist & High-Density) */}
          <div className="flex-shrink-0 grid grid-cols-3 gap-2">
            {/* KPI 1 */}
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                KOMPLAIN
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-slate-900 leading-none">
                  {data.kpi?.totalComplaints || 0}
                </span>
                <span className="text-[11px] font-bold text-slate-500">kasus</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                {Number(data.kpi?.totalRejectQty || 0).toLocaleString('id-ID')} pcs reject
              </div>
            </div>

            {/* KPI 2: RESOLUSI */}
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                RESOLUSI
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-emerald-600 leading-none">
                  {data.kpi?.resolutionRate ?? 0}%
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                {data.kpi?.closedComplaintsCount || 0} Closed · {data.kpi?.openComplaintsCount || 0} Open
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                WAKTU TANGGAP
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-indigo-600 leading-none">
                  {data.kpi?.avgReplyDays || 0}
                </span>
                <span className="text-[11px] font-bold text-slate-500">hari</span>
              </div>
            </div>
          </div>

          {/* 3. Visual Charts Row (Clean, Streamlined Labels) */}
          <div className="flex-shrink-0 grid grid-cols-12 gap-2 h-44">
            {/* Tren Bulanan */}
            <div className="col-span-5 bg-white border border-slate-200 rounded-xl p-2 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-[11px] font-bold text-slate-800 uppercase">
                  Tren Bulanan
                </span>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="text-blue-600">● Kasus</span>
                  <span className="text-amber-500">■ Reject</span>
                </div>
              </div>
              <div className="h-32 mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trend || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B' }} />
                    <YAxis yAxisId="c" allowDecimals={false} tick={{ fontSize: 9, fill: '#64748B' }} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 9, fill: '#64748B' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#fff', fontSize: '11px', padding: '4px 8px' }}
                      formatter={(val: any, name: string) => [val, name === 'cases' ? 'Kasus' : 'Reject']}
                    />
                    <Line yAxisId="c" type="monotone" dataKey="cases" stroke="#2563EB" strokeWidth={2} dot={{ r: 2 }} />
                    <Line yAxisId="r" type="monotone" dataKey="reject" stroke="#F59E0B" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pareto Masalah */}
            <div className="col-span-4 bg-white border border-slate-200 rounded-xl p-2 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-[11px] font-bold text-slate-800 uppercase">
                  Pareto Masalah
                </span>
                <span className="text-[10px] font-bold text-rose-600">● Kumulatif %</span>
              </div>
              <div className="h-32 mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.pareto || []} margin={{ top: 5, right: 10, left: -25, bottom: 12 }}>
                    <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="defectType"
                      tickFormatter={(val: string) => {
                        if (!val) return '';
                        if (val.includes('Karat')) return 'Karat';
                        if (val.includes('Run Out')) return 'Run Out';
                        if (val.includes('Dimension')) return 'Dim Out';
                        if (val.includes('Dent') || val.includes('Scratch')) return 'Scratch';
                        if (val.includes('Crack')) return 'Crack';
                        if (val.includes('Pin Hole') || val.includes('Blow Hole')) return 'Pin Hole';
                        return val.length > 7 ? val.slice(0, 6) + '…' : val;
                      }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={26}
                      tick={{ fontSize: 8, fill: '#475569', fontWeight: 600 }}
                    />
                    <YAxis
                      yAxisId="l"
                      domain={[0, paretoTotal]}
                      allowDecimals={false}
                      tick={{ fontSize: 8, fill: '#64748B' }}
                    />
                    <YAxis yAxisId="r" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 8, fill: '#64748B' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#fff', fontSize: '10px', padding: '4px 8px' }}
                      formatter={(val: any, name: string) => [
                        name === 'rejectQty' ? `${val} pcs` : `${val}%`,
                        name === 'rejectQty' ? 'Reject' : 'Kumulatif',
                      ]}
                      labelFormatter={(lbl: any) => `${lbl}`}
                    />
                    <Bar yAxisId="l" dataKey="rejectQty" fill="#2563EB" radius={[3, 3, 0, 0]} maxBarSize={28} />
                    <Line
                      yAxisId="r"
                      type="monotone"
                      dataKey="cumPct"
                      stroke="#DC2626"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#DC2626', stroke: '#fff', strokeWidth: 1.5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pelanggan */}
            <div className="col-span-3 bg-white border border-slate-200 rounded-xl p-2 flex flex-col justify-between">
              <div className="pb-1 border-b border-slate-100">
                <span className="text-[11px] font-bold text-slate-800 uppercase">
                  Pelanggan
                </span>
              </div>
              <div className="h-32 flex items-center justify-between mt-1">
                <div className="w-24 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.customerBreakdown || []}
                        dataKey="cases"
                        nameKey="customer"
                        cx="50%"
                        cy="50%"
                        innerRadius={22}
                        outerRadius={45}
                        paddingAngle={2}
                      >
                        {(data.customerBreakdown || []).map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CUSTOMER_COLORS[index % CUSTOMER_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#fff', fontSize: '10px', padding: '3px 6px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 pl-2 space-y-1 max-h-28 overflow-y-auto">
                  {(data.customerBreakdown || []).slice(0, 5).map((c: any, idx: number) => (
                    <div key={c.customer} className="flex items-center justify-between text-[10px] leading-tight">
                      <div className="flex items-center gap-1.5 truncate max-w-[85px]">
                        <span
                          className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: CUSTOMER_COLORS[idx % CUSTOMER_COLORS.length] }}
                        />
                        <span className="truncate font-semibold text-slate-700">{c.customer}</span>
                      </div>
                      <span className="font-bold text-slate-900 flex-shrink-0">{c.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Action Items Table (Clean & Text-Minimal) */}
          <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
            {/* Table Control Row */}
            <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Open & Hold
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                  {data.openComplaints?.length || 0}
                </span>

                <div className="h-3.5 w-px bg-slate-300 mx-1" />

                {/* Filter Tabs */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTableFilter('ALL')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      tableFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200/50'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableFilter('HOLD')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      tableFilter === 'HOLD' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-200/50'
                    }`}
                  >
                    Hold
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableFilter('IN_PROGRESS')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      tableFilter === 'IN_PROGRESS' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200/50'
                    }`}
                  >
                    Progress
                  </button>
                </div>
              </div>

              {/* Search */}
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Cari..."
                className="w-36 h-6 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-600"
              />
            </div>

            {/* Table Content */}
            <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-slate-300">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-1.5 px-2 text-center w-8 border border-slate-300">NO</th>
                    <th className="py-1.5 px-2 border border-slate-300 whitespace-nowrap">NO REGISTER</th>
                    <th className="py-1.5 px-2 border border-slate-300">CUSTOMER</th>
                    <th className="py-1.5 px-2 border border-slate-300">PRODUK</th>
                    <th className="py-1.5 px-2 border border-slate-300">DEFECT</th>
                    <th className="py-1.5 px-2 text-right border border-slate-300">QTY</th>
                    <th className="py-1.5 px-2 border border-slate-300">PIC</th>
                    <th className="py-1.5 px-2 text-center border border-slate-300">STATUS</th>
                    <th className="py-1.5 px-1.5 text-center bg-slate-200/70 border border-slate-300 w-11">FMEA</th>
                    <th className="py-1.5 px-1.5 text-center bg-slate-200/70 border border-slate-300 w-11">ECN</th>
                    <th className="py-1.5 px-1.5 text-center bg-slate-200/70 border border-slate-300 w-11">C.PLAN</th>
                    <th className="py-1.5 px-1.5 text-center bg-slate-200/70 border border-slate-300 w-11">C.SHEET</th>
                    <th className="py-1.5 px-1.5 text-center bg-slate-200/70 border border-slate-300 w-11">MPS</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {filteredOpenComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-6 text-center text-slate-400 text-xs border border-slate-200">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    filteredOpenComplaints.map((item: any, idx: number) => {
                      const tone = STATUS_TONE[item.approvalStatus] || STATUS_TONE.OPEN;
                      const chk = item.checklist || {};

                      return (
                        <tr key={item.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/50 transition-colors">
                          <td className="py-1 px-2 text-center text-slate-500 font-bold border border-slate-200">{idx + 1}</td>
                          <td className="py-1 px-2 font-bold font-mono text-blue-600 whitespace-nowrap border border-slate-200">
                            {item.docNo}
                          </td>
                          <td className="py-1 px-2 font-semibold text-slate-800 truncate max-w-[130px] border border-slate-200">
                            {item.customer?.name}
                          </td>
                          <td className="py-1 px-2 font-semibold text-slate-800 truncate max-w-[140px] border border-slate-200">
                            {item.product?.name}
                          </td>
                          <td className="py-1 px-2 font-bold text-rose-700 truncate max-w-[110px] border border-slate-200">
                            {item.defectType}
                          </td>
                          <td className="py-1 px-2 text-right font-bold text-slate-800 tabular-nums border border-slate-200">
                            {item.rejectQty}
                          </td>
                          <td className="py-1 px-2 font-medium text-slate-700 truncate max-w-[90px] border border-slate-200">
                            {item.pic?.name}
                          </td>
                          <td className="py-1 px-2 text-center border border-slate-200">
                            <span className={`inline-block rounded px-1.5 py-0.2 text-[9px] font-bold border ${tone.bg}`}>
                              {tone.label}
                            </span>
                          </td>
                          <td className="py-1 px-1.5 text-center bg-slate-50/60 border border-slate-200">
                            <span className={`inline-flex items-center justify-center h-4 w-4 rounded text-[10px] font-black ${chk.fmea ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                              {chk.fmea ? '✓' : '✕'}
                            </span>
                          </td>
                          <td className="py-1 px-1.5 text-center bg-slate-50/60 border border-slate-200">
                            <span className={`inline-flex items-center justify-center h-4 w-4 rounded text-[10px] font-black ${chk.ecn ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                              {chk.ecn ? '✓' : '✕'}
                            </span>
                          </td>
                          <td className="py-1 px-1.5 text-center bg-slate-50/60 border border-slate-200">
                            <span className={`inline-flex items-center justify-center h-4 w-4 rounded text-[10px] font-black ${chk.controlPlan ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                              {chk.controlPlan ? '✓' : '✕'}
                            </span>
                          </td>
                          <td className="py-1 px-1.5 text-center bg-slate-50/60 border border-slate-200">
                            <span className={`inline-flex items-center justify-center h-4 w-4 rounded text-[10px] font-black ${chk.controlSheet ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                              {chk.controlSheet ? '✓' : '✕'}
                            </span>
                          </td>
                          <td className="py-1 px-1.5 text-center bg-slate-50/60 border border-slate-200">
                            <span className={`inline-flex items-center justify-center h-4 w-4 rounded text-[10px] font-black ${chk.mpsEos ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                              {chk.mpsEos ? '✓' : '✕'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {/* Modal Checklist Dokumen */}
      {selectedComplaint && editingChecklist && (
        <Modal
          title={`Checklist: ${selectedComplaint.docNo}`}
          onClose={() => setSelectedComplaint(null)}
        >
          <div className="space-y-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <p className="font-semibold">{selectedComplaint.customer?.name} · {selectedComplaint.product?.name}</p>
              <p className="text-slate-500">{selectedComplaint.defectType} ({selectedComplaint.rejectQty} pcs)</p>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <span className="font-bold text-slate-800">1. FMEA</span>
                <input
                  type="checkbox"
                  checked={!!editingChecklist.fmea}
                  onChange={(e) => setEditingChecklist({ ...editingChecklist, fmea: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <span className="font-bold text-slate-800">2. ECN</span>
                <input
                  type="checkbox"
                  checked={!!editingChecklist.ecn}
                  onChange={(e) => setEditingChecklist({ ...editingChecklist, ecn: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <span className="font-bold text-slate-800">3. Control Plan</span>
                <input
                  type="checkbox"
                  checked={!!editingChecklist.controlPlan}
                  onChange={(e) => setEditingChecklist({ ...editingChecklist, controlPlan: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <span className="font-bold text-slate-800">4. Control Sheet</span>
                <input
                  type="checkbox"
                  checked={!!editingChecklist.controlSheet}
                  onChange={(e) => setEditingChecklist({ ...editingChecklist, controlSheet: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <span className="font-bold text-slate-800">5. MPS & EOS</span>
                <input
                  type="checkbox"
                  checked={!!editingChecklist.mpsEos}
                  onChange={(e) => setEditingChecklist({ ...editingChecklist, mpsEos: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="rounded-lg border border-slate-200 px-3 py-1 font-bold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveChecklist}
                disabled={savingChecklist}
                className="rounded-lg bg-blue-600 px-4 py-1 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingChecklist ? '...' : 'Simpan'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

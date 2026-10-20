'use client';
import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, session, MONTHS, fmtDate, fmtRp, yearOptions } from '@/lib/api';
import { Badge, Modal, Tabs } from '@/components/ui';

function ComplaintActionWatcher({ onAction }: { onAction: (action: string | null) => void }) {
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  useEffect(() => {
    onAction(action);
  }, [action, onAction]);
  return null;
}

const today = () => new Date().toISOString().slice(0, 10);

const DEFAULT_DOCS = {
  fmea: false,
  ecn: false,
  controlPlan: false,
  controlSheet: false,
  mps: false,
  eos: false,
};

const DEFAULT_YOKOTEN = {
  part: '',
  process: '',
  status: 'N/A', // Target | Done | N/A
};

const EMPTY_FORM = {
  dateMTM: today(),
  dateCust: today(),
  docNo: '',
  customerId: '',
  productId: '',
  defectType: '',
  rejectQty: '',
  claimPrice: '',
  rootCauseDM: '',
  rootCauseDO: '',
  actionPlan: '',
  picId: '',
  planDate: today(),
  actualDate: '',
  docs: { ...DEFAULT_DOCS },
  yokoten: { ...DEFAULT_YOKOTEN },
  description: '',
};

export default function ComplaintsPage() {
  const user = session.user();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(0); // 0 = Semua
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'HOLD' | 'CLOSED'>('ALL');
  const [search, setSearch] = useState('');

  const [rows, setRows] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [openModal, setOpenModal] = useState(false);
  const [detailModal, setDetailModal] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Helper to parse metadata
  function parseMeta(desc: string | null) {
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

  function getCleanDescription(desc: string | null) {
    if (!desc) return '';
    return desc.replace(/\[META:.*?\]\s*/g, '').replace(/\[DOCS:.*?\]\s*/g, '').trim();
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/complaints?year=${year}${month ? `&month=${month}` : ''}`);
      setRows(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([api.get('/master/customers'), api.get('/master/products'), api.get('/master/users')])
      .then(([c, p, u]) => {
        setCustomers(c);
        setProducts(p);
        setUsers(u);
      })
      .catch(() => {});
  }, []);

  const role = user?.role;
  const can = (...r: string[]) => role === 'ADMIN' || (role && r.includes(role));

  function openCreateModal() {
    setError('');
    setEditingId(null);
    // Generate register number preview e.g. 01/QA/01/2026
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const nextSeq = String(rows.length + 1).padStart(2, '0');
    const regPreview = `${nextSeq}/QA/${mm}/${yyyy}`;

    setForm({
      ...EMPTY_FORM,
      docNo: regPreview,
      dateMTM: today(),
      dateCust: today(),
      picId: user?.id ? String(user.id) : '',
    });
    setOpenModal(true);
  }

  function openEditModal(r: any) {
    setError('');
    setEditingId(r.id);
    const meta = parseMeta(r.description);
    const cleanDesc = getCleanDescription(r.description);

    setForm({
      dateMTM: r.date.slice(0, 10),
      dateCust: meta.dateCust || r.date.slice(0, 10),
      docNo: r.docNo,
      customerId: String(r.customerId),
      productId: String(r.productId),
      defectType: r.defectType,
      rejectQty: String(r.rejectQty),
      claimPrice: meta.claimPrice ? String(meta.claimPrice) : '',
      rootCauseDM: meta.dm || '',
      rootCauseDO: meta.do || '',
      actionPlan: meta.actionPlan || '',
      picId: String(r.picId),
      planDate: meta.planDate || today(),
      actualDate: meta.actualDate || '',
      docs: { ...DEFAULT_DOCS, ...(meta.docs || {}) },
      yokoten: { ...DEFAULT_YOKOTEN, ...(meta.yokoten || {}) },
      description: cleanDesc,
    });
    setOpenModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const metaPayload = {
      dateCust: form.dateCust,
      claimPrice: form.claimPrice ? Number(form.claimPrice) : 0,
      dm: form.rootCauseDM,
      do: form.rootCauseDO,
      actionPlan: form.actionPlan,
      planDate: form.planDate,
      actualDate: form.actualDate,
      docs: form.docs,
      yokoten: form.yokoten,
    };

    const finalDescription = `[META:${JSON.stringify(metaPayload)}] [DOCS:${JSON.stringify(form.docs)}] ${form.description || form.defectType}`;

    try {
      if (editingId) {
        await api.patch(`/complaints/${editingId}`, {
          date: form.dateMTM,
          customerId: +form.customerId,
          productId: +form.productId,
          defectType: form.defectType,
          rejectQty: +form.rejectQty,
          picId: +form.picId,
          description: finalDescription,
        });
      } else {
        await api.post('/complaints', {
          date: form.dateMTM,
          docNo: form.docNo || undefined,
          customerId: +form.customerId,
          productId: +form.productId,
          defectType: form.defectType,
          rejectQty: +form.rejectQty,
          picId: +form.picId,
          description: finalDescription,
        });
      }
      setOpenModal(false);
      load();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan komplain');
    }
  }

  async function handleApprovalAction(id: number, action: string) {
    const note = action === 'reject' ? prompt('Alasan penolakan komplain:') : undefined;
    if (action === 'reject' && !note) return;

    try {
      if (action === 'close') {
        await api.post(`/complaints/${id}/close`, {});
      } else {
        await api.post(`/complaints/${id}/${action}`, { note });
      }
      load();
      if (detailModal && detailModal.id === id) {
        setDetailModal(null);
      }
    } catch (err: any) {
      alert(err.message);
    }
  }

  // Filter rows
  const filteredRows = rows.filter((r) => {
    // Status filter
    if (statusFilter === 'OPEN' && r.caseStatus !== 'OPEN') return false;
    if (statusFilter === 'CLOSED' && r.caseStatus !== 'CLOSED') return false;
    if (statusFilter === 'HOLD') {
      const isHold = r.approvalStatus === 'PREPARED' || r.approvalStatus === 'CHECKED';
      if (!isHold) return false;
    }

    // Text search
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.docNo.toLowerCase().includes(q) ||
      r.customer?.name.toLowerCase().includes(q) ||
      r.product?.name.toLowerCase().includes(q) ||
      r.product?.partNo.toLowerCase().includes(q) ||
      r.defectType.toLowerCase().includes(q)
    );
  });

  const totalReject = filteredRows.reduce((s, r) => s + (r.rejectQty || 0), 0);

  const handleAction = useCallback((act: string | null) => {
    if (act === 'new') {
      setEditingId(null);
      setForm(EMPTY_FORM);
      setOpenModal(true);
    }
  }, []);

  return (
    <div className="space-y-3.5">
      <Suspense fallback={null}>
        <ComplaintActionWatcher onAction={handleAction} />
      </Suspense>
      {/* Top Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            {(['ALL', 'OPEN', 'HOLD', 'CLOSED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-md transition-all ${
                  statusFilter === s
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s === 'ALL' ? 'Semua' : s === 'HOLD' ? 'Hold / Review' : s === 'OPEN' ? 'Open' : 'Close'}
              </button>
            ))}
          </div>

          {/* Month selector */}
          <select
            aria-label="Bulan"
            value={month}
            onChange={(e) => setMonth(+e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none"
          >
            <option value={0}>Semua Bulan</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>

          {/* Year selector */}
          <select
            aria-label="Tahun"
            value={year}
            onChange={(e) => setYear(+e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none"
          >
            {yearOptions().map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Search box */}
          <input
            type="text"
            placeholder="Cari register, part, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 sm:w-60"
          />

          {/* Input Komplain Baru Button */}
          {can('QC_STAFF', 'MARKETING') && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Input Komplain Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Info Bar */}
      <div className="flex items-center justify-between text-xs font-medium text-slate-500 px-1">
        <span>Menampilkan {filteredRows.length} komplain · {totalReject.toLocaleString('id-ID')} pcs total reject</span>
        <span className="text-[11px] text-slate-400">Alur: Prepare (PIC QA) → Check (SPV QA) → Approve (Mgr QA)</span>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* Data Table Interaktif (Bergaris & Compact) */}
      <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase">
                <th className="py-1.5 px-2.5 whitespace-nowrap border border-slate-300 text-center w-8">No</th>
                <th className="py-1.5 px-2.5 whitespace-nowrap border border-slate-300">No Register</th>
                <th className="py-1.5 px-2.5 whitespace-nowrap border border-slate-300">Tanggal MTM</th>
                <th className="py-1.5 px-2.5 whitespace-nowrap border border-slate-300">Customer</th>
                <th className="py-1.5 px-2.5 border border-slate-300">Part Name & Number</th>
                <th className="py-1.5 px-2.5 border border-slate-300">Masalah / Defect</th>
                <th className="py-1.5 px-2 text-right whitespace-nowrap border border-slate-300">Qty Reject</th>
                <th className="py-1.5 px-2.5 whitespace-nowrap border border-slate-300">PIC QA</th>
                <th className="py-1.5 px-2.5 text-center whitespace-nowrap border border-slate-300">Approval</th>
                <th className="py-1.5 px-2.5 text-center whitespace-nowrap border border-slate-300">Status</th>
                <th className="py-1.5 px-2.5 text-center w-36 whitespace-nowrap border border-slate-300">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 border border-slate-200">
                    Memuat daftar komplain...
                  </td>
                </tr>
              )}
              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 border border-slate-200">
                    Tidak ada komplain ditemukan sesuai kriteria filter.
                  </td>
                </tr>
              )}
              {!loading &&
                filteredRows.map((r, idx) => {
                  const meta = parseMeta(r.description);

                  return (
                    <tr key={r.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/50 transition-colors">
                      <td className="py-1.5 px-2 text-center text-slate-500 font-bold border border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-2.5 font-bold text-slate-900 font-mono whitespace-nowrap border border-slate-200">
                        {r.docNo}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-600 whitespace-nowrap border border-slate-200">
                        {fmtDate(r.date)}
                      </td>
                      <td className="py-1.5 px-2.5 font-semibold text-slate-800 whitespace-nowrap border border-slate-200">
                        {r.customer?.name}
                      </td>
                      <td className="py-1.5 px-2.5 max-w-[200px] border border-slate-200">
                        <div className="font-semibold text-slate-900 truncate">{r.product?.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{r.product?.partNo}</div>
                      </td>
                      <td className="py-1.5 px-2.5 max-w-[180px] border border-slate-200">
                        <div className="font-medium text-slate-800 truncate">{r.defectType}</div>
                        {meta.claimPrice ? (
                          <div className="text-[10px] text-amber-600 font-semibold">{fmtRp(meta.claimPrice)}</div>
                        ) : null}
                      </td>
                      <td className="py-1.5 px-2 text-right font-bold text-slate-900 tabular-nums border border-slate-200">
                        {r.rejectQty?.toLocaleString('id-ID')}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-700 whitespace-nowrap border border-slate-200">
                        {r.pic?.name || '-'}
                      </td>
                      <td className="py-1.5 px-2.5 text-center whitespace-nowrap border border-slate-200">
                        <Badge value={r.approvalStatus} />
                      </td>
                      <td className="py-1.5 px-2.5 text-center whitespace-nowrap border border-slate-200">
                        <Badge value={r.caseStatus} />
                      </td>
                      <td className="py-1.5 px-2.5 text-center whitespace-nowrap border border-slate-200">
                        <button
                          onClick={() => setDetailModal(r)}
                          title="Lihat Detail & Tindakan"
                          className="px-3 py-1 text-[11px] font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-300 shadow-sm"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Input / Edit Komplain Baru Modal */}
      {openModal && (
        <Modal
          title={editingId ? 'Edit Komplain Pelanggan' : 'Form Input Komplain Baru'}
          onClose={() => setOpenModal(false)}
        >
          <form onSubmit={handleSave} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            {/* Bagian 1: Identitas Dokumen */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                1. Identitas Dokumen
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Tanggal MTM</label>
                  <input
                    type="date"
                    required
                    value={form.dateMTM}
                    onChange={(e) => setForm({ ...form, dateMTM: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Tanggal Cust</label>
                  <input
                    type="date"
                    required
                    value={form.dateCust}
                    onChange={(e) => setForm({ ...form, dateCust: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Register Number (Auto / Custom)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: 01/QA/01/2026"
                    value={form.docNo}
                    onChange={(e) => setForm({ ...form, docNo: e.target.value })}
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Customer / Pelanggan</label>
                  <select
                    required
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Pilih Customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Part Name & Number</label>
                  <select
                    required
                    value={form.productId}
                    onChange={(e) => setForm({ ...form, productId: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Pilih Part...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.partNo})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bagian 2: Detail Masalah */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-600" />
                2. Detail Masalah
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Jenis Cacat / Defect</label>
                  <input
                    type="text"
                    required
                    placeholder="misal: Crack, Dent, Under Cut"
                    value={form.defectType}
                    onChange={(e) => setForm({ ...form, defectType: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Qty Reject (pcs)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.rejectQty}
                    onChange={(e) => setForm({ ...form, rejectQty: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Claim Price (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.claimPrice}
                    onChange={(e) => setForm({ ...form, claimPrice: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Problem Description</label>
                <textarea
                  rows={2}
                  placeholder="Penjelasan detail kondisi defect yang ditemukan..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Bagian 3: Analisis Akar Masalah (Root Cause DM & DO) */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-600" />
                3. Analisis Akar Masalah (Root Cause)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Department Method (DM)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Analisis penyebab dari sisi metode / sistem departemen..."
                    value={form.rootCauseDM}
                    onChange={(e) => setForm({ ...form, rootCauseDM: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Direct Operation (DO)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Analisis penyebab dari sisi operasional langsung di line..."
                    value={form.rootCauseDO}
                    onChange={(e) => setForm({ ...form, rootCauseDO: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Bagian 4: Tindakan Perbaikan (Countermeasure) */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                4. Tindakan Perbaikan (Countermeasure)
              </h4>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Action Plan</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Langkah countermeasure / tindakan koreksi & pencegahan..."
                  value={form.actionPlan}
                  onChange={(e) => setForm({ ...form, actionPlan: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">PIC QA</label>
                  <select
                    required
                    value={form.picId}
                    onChange={(e) => setForm({ ...form, picId: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Pilih PIC...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.department})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Plan Date</label>
                  <input
                    type="date"
                    required
                    value={form.planDate}
                    onChange={(e) => setForm({ ...form, planDate: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Actual Date</label>
                  <input
                    type="date"
                    value={form.actualDate}
                    onChange={(e) => setForm({ ...form, actualDate: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Bagian 5: Checklist Dokumen Terkait */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-600" />
                5. Checklist Dokumen Terkait
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
                {[
                  { key: 'fmea', label: 'FMEA' },
                  { key: 'ecn', label: 'ECN' },
                  { key: 'controlPlan', label: 'Control Plan' },
                  { key: 'controlSheet', label: 'Control Sheet' },
                  { key: 'mps', label: 'MPS' },
                  { key: 'eos', label: 'EOS' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer text-xs font-medium transition-colors ${
                      (form.docs as any)[item.key]
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={(form.docs as any)[item.key] || false}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          docs: { ...form.docs, [item.key]: e.target.checked },
                        })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Bagian 6: Status Adopsi (Yokoten) */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-teal-600" />
                6. Status Adopsi (Yokoten)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Part Terkait</label>
                  <input
                    type="text"
                    placeholder="misal: All Stem Series"
                    value={form.yokoten.part}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        yokoten: { ...form.yokoten, part: e.target.value },
                      })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Process Terkait</label>
                  <input
                    type="text"
                    placeholder="misal: Machining Line B"
                    value={form.yokoten.process}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        yokoten: { ...form.yokoten, process: e.target.value },
                      })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Status Adopsi</label>
                  <select
                    value={form.yokoten.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        yokoten: { ...form.yokoten, status: e.target.value },
                      })
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="N/A">N/A</option>
                    <option value="Target">Target</option>
                    <option value="Done">Done (Telah Diadopsi)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {error}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
              >
                {editingId ? 'Simpan Perubahan' : 'Simpan & Daftarkan Komplain'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Detail Komplain Lengkap */}
      {detailModal && (
        <Modal
          title={`Detail Komplain: ${detailModal.docNo}`}
          onClose={() => setDetailModal(null)}
        >
          {(() => {
            const meta = parseMeta(detailModal.description);
            const docs = meta.docs || {};
            const yokoten = meta.yokoten || {};
            const cleanDesc = getCleanDescription(detailModal.description);

            return (
              <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1 text-xs">
                {/* Status Bar */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Register Number</span>
                    <p className="font-bold text-slate-900 font-mono text-sm">{detailModal.docNo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge value={detailModal.approvalStatus} />
                    <Badge value={detailModal.caseStatus} />
                  </div>
                </div>

                {/* Workflow Approval Timeline */}
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Workflow Otorisasi Berjenjang
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className={`p-2 rounded border ${detailModal.preparedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-400'}`}>
                      <span className="font-bold block">1. PREPARE</span>
                      <span className="text-[10px]">{detailModal.preparedBy?.name || 'PIC QA'}</span>
                    </div>
                    <div className={`p-2 rounded border ${detailModal.checkedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-400'}`}>
                      <span className="font-bold block">2. CHECK</span>
                      <span className="text-[10px]">{detailModal.checkedBy?.name || 'Supervisor QA'}</span>
                    </div>
                    <div className={`p-2 rounded border ${detailModal.approvedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-400'}`}>
                      <span className="font-bold block">3. APPROVE</span>
                      <span className="text-[10px]">{detailModal.approvedBy?.name || 'Manager QA'}</span>
                    </div>
                  </div>
                </div>

                {/* Identitas Dokumen */}
                <div className="grid grid-cols-2 gap-3 border border-slate-200 rounded-lg p-3">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Customer</span>
                    <span className="font-semibold text-slate-800">{detailModal.customer?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Part Name & Number</span>
                    <span className="font-semibold text-slate-800">{detailModal.product?.name} ({detailModal.product?.partNo})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Tanggal MTM</span>
                    <span className="text-slate-700">{fmtDate(detailModal.date)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Tanggal Cust</span>
                    <span className="text-slate-700">{meta.dateCust ? fmtDate(meta.dateCust) : '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Qty Reject</span>
                    <span className="font-bold text-slate-900">{detailModal.rejectQty} pcs</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Claim Price</span>
                    <span className="font-bold text-amber-600">{meta.claimPrice ? fmtRp(meta.claimPrice) : '-'}</span>
                  </div>
                </div>

                {/* Root Cause & Countermeasure */}
                <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <span className="font-bold text-slate-800 block">Analisis Akar Masalah (Root Cause)</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-700 bg-white p-2 rounded border border-slate-100">
                    <div>
                      <strong className="text-slate-900 block text-[10px]">Department Method (DM):</strong>
                      <p>{meta.dm || '-'}</p>
                    </div>
                    <div>
                      <strong className="text-slate-900 block text-[10px]">Direct Operation (DO):</strong>
                      <p>{meta.do || '-'}</p>
                    </div>
                  </div>
                  <div className="pt-1">
                    <span className="font-bold text-slate-800 block">Tindakan Perbaikan (Countermeasure)</span>
                    <p className="bg-white p-2 rounded border border-slate-100 text-slate-700">{meta.actionPlan || '-'}</p>
                    <div className="flex gap-4 text-[11px] text-slate-500 mt-1">
                      <span>Target Plan: {meta.planDate || '-'}</span>
                      <span>Actual Selesai: {meta.actualDate || '-'}</span>
                      <span>PIC: {detailModal.pic?.name || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Checklist & Yokoten */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-slate-200 rounded-lg p-3">
                    <span className="font-bold text-slate-800 block mb-1">Checklist Dokumen Mutu</span>
                    <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                      {['fmea', 'ecn', 'controlPlan', 'controlSheet', 'mps', 'eos'].map((k) => (
                        <span
                          key={k}
                          className={`px-1.5 py-0.5 rounded ${
                            docs[k] ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {k.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <span className="font-bold text-slate-800 block mb-1">Status Adopsi (Yokoten)</span>
                    <p className="text-slate-600">Part: {yokoten.part || '-'}</p>
                    <p className="text-slate-600">Process: {yokoten.process || '-'}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                      Status: {yokoten.status || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Modal Footer Actions (Semua Aksi Dipusatkan di Sini) */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Edit Button (if draft & QC_STAFF) */}
                    {detailModal.approvalStatus === 'DRAFT' && can('QC_STAFF') && (
                      <button
                        onClick={() => {
                          const item = detailModal;
                          setDetailModal(null);
                          openEditModal(item);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                      >
                        Edit Komplain
                      </button>
                    )}

                    {/* Prepare Button (QC Staff) */}
                    {detailModal.approvalStatus === 'DRAFT' && can('QC_STAFF') && (
                      <button
                        onClick={async () => {
                          await handleApprovalAction(detailModal.id, 'prepare');
                          setDetailModal(null);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                      >
                        Prepare
                      </button>
                    )}

                    {/* Check Button (QC Supervisor) */}
                    {detailModal.approvalStatus === 'PREPARED' && can('QC_SUPERVISOR') && (
                      <button
                        onClick={async () => {
                          await handleApprovalAction(detailModal.id, 'check');
                          setDetailModal(null);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
                      >
                        Check
                      </button>
                    )}

                    {/* Approve Button (Manager) */}
                    {detailModal.approvalStatus === 'CHECKED' && can('MANAGER') && (
                      <button
                        onClick={async () => {
                          await handleApprovalAction(detailModal.id, 'approve');
                          setDetailModal(null);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-colors"
                      >
                        Approve
                      </button>
                    )}

                    {/* Close Case Button */}
                    {detailModal.approvalStatus === 'APPROVED' && detailModal.caseStatus === 'OPEN' && can('QC_STAFF', 'QC_SUPERVISOR') && (
                      <button
                        onClick={async () => {
                          await handleApprovalAction(detailModal.id, 'close');
                          setDetailModal(null);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 text-white shadow-sm transition-colors"
                      >
                        Close Case
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setDetailModal(null)}
                    className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}

'use client';
import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, session, fmtDate, fmtRp, yearOptions } from '@/lib/api';
import { Badge, Modal } from '@/components/ui';

function ClaimCategoryWatcher({ onCategory }: { onCategory: (cat: string | null) => void }) {
  const searchParams = useSearchParams();
  const cat = searchParams.get('category');
  useEffect(() => {
    onCategory(cat);
  }, [cat, onCategory]);
  return null;
}

const STATUSES = ['INVESTIGASI', 'DISETUJUI', 'DITOLAK', 'SELESAI'];

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  claimNo: '',
  category: 'FG' as 'FG' | 'NON_FORGING',
  customerId: '',
  productId: '',
  qty: '',
  amount: '',
  evidenceName: '',
  evidenceUrl: '',
  status: 'INVESTIGASI',
  description: '',
};

export default function ClaimsPage() {
  const user = session.user();
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'FG' | 'NON_FORGING'>('FG');
  const [search, setSearch] = useState('');

  const [rows, setRows] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [openModal, setOpenModal] = useState(false);
  const [detailModal, setDetailModal] = useState<any | null>(null);
  const [previewEvidence, setPreviewEvidence] = useState<{ name: string; url: string } | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomRotation, setZoomRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const resetZoom = useCallback(() => {
    setZoomScale(1);
    setZoomRotation(0);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  const openEvidencePreview = useCallback((ev: { name: string; url: string }) => {
    setZoomScale(1);
    setZoomRotation(0);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
    setPreviewEvidence(ev);
  }, []);

  useEffect(() => {
    if (!previewEvidence) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewEvidence(null);
      if (e.key === '+' || e.key === '=') setZoomScale((s) => Math.min(+(s + 0.25).toFixed(2), 4));
      if (e.key === '-') setZoomScale((s) => Math.max(+(s - 0.25).toFixed(2), 0.5));
      if (e.key === '0') resetZoom();
      if (e.key === 'r' || e.key === 'R') setZoomRotation((r) => (r + 90) % 360);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewEvidence, resetZoom]);

  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Parse evidence from description if available
  function parseEvidence(desc: string | null): { name: string; url: string } | null {
    if (!desc) return null;
    const match = desc.match(/\[EVIDENCE:(.*?)\]/);
    if (!match) return null;
    const val = match[1];
    let name = val;
    let url = '';
    if (val.includes('|')) {
      const parts = val.split('|');
      name = parts[0];
      url = parts.slice(1).join('|');
    } else if (val.startsWith('data:') || val.startsWith('http://') || val.startsWith('https://')) {
      url = val;
      name = 'Bukti-Evidence';
    } else {
      url = `/asset/${val}`;
    }
    return { name, url };
  }

  function getCleanDesc(desc: string | null) {
    if (!desc) return '-';
    return desc.replace(/\[EVIDENCE:.*?\]\s*/g, '').trim() || '-';
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/claims?year=${year}&category=${activeTab}`);
      setRows(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [year, activeTab]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([api.get('/master/customers'), api.get('/master/products')])
      .then(([c, p]) => {
        setCustomers(c);
        setProducts(p);
      })
      .catch(() => {});
  }, []);

  const role = user?.role;
  const canCreate = role === 'ADMIN' || ['QC_STAFF', 'QC_SUPERVISOR', 'MARKETING'].includes(role!);
  const canStatus = role === 'ADMIN' || ['QC_SUPERVISOR', 'MANAGER'].includes(role!);

  function openCreateModal() {
    setError('');
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const num = String(rows.length + 1).padStart(2, '0');
    const autoNo = `${num}/QA/${m}/${y}`;

    setForm({
      ...EMPTY_FORM,
      claimNo: autoNo,
      category: activeTab,
      date: new Date().toISOString().slice(0, 10),
    });
    setOpenModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const evPayload = form.evidenceName
      ? (form.evidenceUrl ? `${form.evidenceName}|${form.evidenceUrl}` : form.evidenceName)
      : '';
    const finalDescription = evPayload
      ? `[EVIDENCE:${evPayload}] ${form.description || ''}`.trim()
      : (form.description || '');

    try {
      await api.post('/claims', {
        date: form.date,
        claimNo: form.claimNo || undefined,
        category: form.category,
        customerId: +form.customerId,
        productId: +form.productId,
        qty: +form.qty,
        amount: +form.amount,
        description: finalDescription,
      });
      setOpenModal(false);
      load();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan klaim');
    }
  }

  async function changeStatus(id: number, status: string) {
    try {
      await api.patch(`/claims/${id}/status`, { status });
      load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  const filteredRows = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.claimNo.toLowerCase().includes(q) ||
      r.customer?.name.toLowerCase().includes(q) ||
      r.product?.name.toLowerCase().includes(q) ||
      r.product?.partNo.toLowerCase().includes(q)
    );
  });

  const totalAmount = filteredRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalQty = filteredRows.reduce((s, r) => s + Number(r.qty || 0), 0);

  const handleCategory = useCallback((cat: string | null) => {
    if (cat === 'NON_FORGING') setActiveTab('NON_FORGING');
    else if (cat === 'FG') setActiveTab('FG');
  }, []);

  return (
    <div className="space-y-3.5">
      <Suspense fallback={null}>
        <ClaimCategoryWatcher onCategory={handleCategory} />
      </Suspense>
      {/* Top Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Category Tabs: FG vs Non-Forging */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTab('FG')}
            className={`px-3.5 py-1.5 rounded-md transition-all ${
              activeTab === 'FG'
                ? 'bg-white text-blue-600 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Claim Finished Goods (FG)
          </button>
          <button
            onClick={() => setActiveTab('NON_FORGING')}
            className={`px-3.5 py-1.5 rounded-md transition-all ${
              activeTab === 'NON_FORGING'
                ? 'bg-white text-blue-600 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Claim Non-Forging
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Year selector */}
          <select
            aria-label="Tahun Klaim"
            value={year}
            onChange={(e) => setYear(+e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none"
          >
            {yearOptions().map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Search box */}
          <input
            type="text"
            placeholder="Cari no register, part, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 sm:w-56"
          />

          {/* Input Klaim Button */}
          {canCreate && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Catat Klaim Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="flex items-center justify-between text-xs font-medium text-slate-500 px-1">
        <span>
          {filteredRows.length} klaim ({activeTab === 'FG' ? 'Finished Goods' : 'Non-Forging'}) · Total Qty: {totalQty.toLocaleString('id-ID')} pcs
        </span>
        <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          Akumulasi Klaim: {fmtRp(totalAmount)}
        </span>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* Claims Data Table (Bergaris & Compact) */}
      <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase">
                <th className="py-1.5 px-2.5 whitespace-nowrap border border-slate-300 text-center w-8">No</th>
                <th className="py-1.5 px-2.5 whitespace-nowrap border border-slate-300">REGISTER NUMBER</th>
                <th className="py-1.5 px-2.5 whitespace-nowrap border border-slate-300">Tanggal Issue</th>
                <th className="py-1.5 px-2.5 whitespace-nowrap border border-slate-300">Customer</th>
                <th className="py-1.5 px-2.5 border border-slate-300">Part Name & Number</th>
                <th className="py-1.5 px-2 text-right whitespace-nowrap border border-slate-300">Qty</th>
                <th className="py-1.5 px-2.5 text-right whitespace-nowrap border border-slate-300">Total Nominal (Rp)</th>
                <th className="py-1.5 px-2.5 text-center whitespace-nowrap border border-slate-300">Bukti Evidence</th>
                <th className="py-1.5 px-2.5 whitespace-nowrap border border-slate-300">Status Penggantian</th>
                <th className="py-1.5 px-2.5 text-center w-24 whitespace-nowrap border border-slate-300">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 border border-slate-200">
                    Memuat data klaim...
                  </td>
                </tr>
              )}
              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 border border-slate-200">
                    Belum ada data klaim untuk kategori {activeTab === 'FG' ? 'Finished Goods' : 'Non-Forging'}.
                  </td>
                </tr>
              )}
              {!loading &&
                filteredRows.map((r, idx) => {
                  const evidence = parseEvidence(r.description);

                  return (
                    <tr key={r.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/50 transition-colors">
                      <td className="py-1.5 px-2 text-center text-slate-500 font-bold border border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-2.5 font-bold text-slate-900 font-mono whitespace-nowrap border border-slate-200">
                        {r.claimNo}
                        {r.complaint && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Ref: {r.complaint.docNo}
                          </span>
                        )}
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
                      <td className="py-1.5 px-2 text-right font-bold text-slate-900 tabular-nums border border-slate-200">
                        {r.qty?.toLocaleString('id-ID')}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-bold text-amber-700 tabular-nums whitespace-nowrap border border-slate-200">
                        {fmtRp(r.amount)}
                      </td>
                      <td className="py-2 px-2.5 text-center whitespace-nowrap border border-slate-200">
                        {evidence ? (
                          <div className="inline-flex flex-col items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEvidencePreview(evidence)}
                              title={`Klik untuk memperbesar / zoom bukti: ${evidence.name}`}
                              className="group relative block rounded-lg border-2 border-slate-200 hover:border-blue-500 bg-white p-1 shadow-xs hover:shadow-md transition-all cursor-pointer overflow-hidden"
                            >
                              <img
                                src={evidence.url}
                                alt={evidence.name}
                                className="h-12 w-20 object-contain rounded bg-slate-50 group-hover:scale-105 transition-transform duration-200"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-blue-900/0 group-hover:bg-blue-900/25 rounded-md flex items-center justify-center transition-colors">
                                <span className="opacity-0 group-hover:opacity-100 bg-black/75 text-white rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1 font-semibold transition-opacity shadow">
                                  🔍 Zoom
                                </span>
                              </div>
                            </button>
                            <span className="text-[10px] text-slate-500 truncate max-w-[110px] font-medium block" title={evidence.name}>
                              {evidence.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 whitespace-nowrap border border-slate-200">
                        {canStatus ? (
                          <select
                            aria-label="Ubah status klaim"
                            className="text-[11px] font-semibold border border-slate-300 rounded px-2 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={r.status}
                            onChange={(e) => changeStatus(r.id, e.target.value)}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s === 'INVESTIGASI' ? 'Investigasi' : s === 'DISETUJUI' ? 'Disetujui' : s === 'DITOLAK' ? 'Ditolak' : 'Selesai / Diganti'}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge value={r.status} />
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 text-center whitespace-nowrap border border-slate-200">
                        <button
                          onClick={() => setDetailModal(r)}
                          className="px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
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

      {/* Form Input & Update Klaim Modal */}
      {openModal && (
        <Modal
          title={`Catat Klaim Baru: ${activeTab === 'FG' ? 'Finished Goods (FG)' : 'Non-Forging'}`}
          onClose={() => setOpenModal(false)}
        >
          <form onSubmit={handleSave} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">REGISTER NUMBER</label>
                <input
                  type="text"
                  required
                  value={form.claimNo}
                  onChange={(e) => setForm({ ...form, claimNo: e.target.value })}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  placeholder="misal: 01/QA/01/2025"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Tanggal Issue</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Qty Klaim (pcs)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  placeholder="Jumlah pcs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Total Nominal Klaim (Rp)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                  placeholder="Nominal kerugian rupiah..."
                />
              </div>
            </div>

            {/* Upload Evidence Bukti */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <label className="text-[11px] font-semibold text-slate-700 block">
                Upload Evidence Bukti (PDF / Foto bukti)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setForm((prev: any) => ({
                          ...prev,
                          evidenceName: f.name,
                          evidenceUrl: reader.result as string,
                        }));
                      };
                      reader.readAsDataURL(f);
                    }
                  }}
                  className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              {/* Instant Image Preview in Form */}
              {(form.evidenceUrl || form.evidenceName) && (
                <div className="mt-2 p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {form.evidenceUrl ? (
                      <img
                        src={form.evidenceUrl}
                        alt={form.evidenceName}
                        className="h-12 w-12 object-cover rounded border border-slate-200 shadow-xs"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded flex items-center justify-center font-bold text-xs">
                        FILE
                      </div>
                    )}
                    <div className="text-xs">
                      <p className="font-semibold text-slate-800">{form.evidenceName}</p>
                      <p className="text-[10px] text-emerald-600 font-medium">✓ File siap diunggah & ditampilkan</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, evidenceName: '', evidenceUrl: '' })}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 hover:bg-rose-50 rounded"
                  >
                    Hapus
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Keterangan / Status Penggantian
              </label>
              <textarea
                rows={2}
                placeholder="Rincian kerusakan atau catatan kompensasi..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {error}
              </div>
            )}

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
                Simpan Data Klaim
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Modal */}
      {detailModal && (
        <Modal
          title={`Detail Register: ${detailModal.claimNo}`}
          onClose={() => setDetailModal(null)}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Register Number</span>
                <p className="font-bold text-slate-900 font-mono text-sm">{detailModal.claimNo}</p>
                <span className="text-[10px] text-slate-500 font-medium">
                  Kategori: {detailModal.category === 'FG' ? 'Finished Goods (FG)' : 'Non-Forging'}
                </span>
              </div>
              <Badge value={detailModal.status} />
            </div>

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
                <span className="text-slate-400 text-[10px] block">Tanggal Issue</span>
                <span className="text-slate-700">{fmtDate(detailModal.date)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Qty Reject</span>
                <span className="font-bold text-slate-900">{detailModal.qty} pcs</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Total Nominal Klaim</span>
                <span className="font-bold text-amber-700 text-sm">{fmtRp(detailModal.amount)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Evidence Terlampir</span>
                {(() => {
                  const ev = parseEvidence(detailModal.description);
                  if (!ev) return <span className="font-medium text-slate-400">Tidak ada</span>;
                  return (
                    <button
                      type="button"
                      onClick={() => openEvidencePreview(ev)}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold mt-0.5"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {ev.name} (Lihat Bukti)
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Display Evidence Image Directly in Detail Modal */}
            {(() => {
              const ev = parseEvidence(detailModal.description);
              if (!ev) return null;
              return (
                <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Tampilan Bukti Evidence
                    </span>
                    <button
                      type="button"
                      onClick={() => openEvidencePreview(ev)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline flex items-center gap-1"
                    >
                      🔍 Buka & Zoom Layar Penuh
                    </button>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-slate-200 bg-white p-2 flex flex-col items-center justify-center">
                    <img
                      src={ev.url}
                      alt={ev.name}
                      className="max-h-52 max-w-full object-contain rounded cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => openEvidencePreview(ev)}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).alt = 'File Dokumen: ' + ev.name;
                      }}
                    />
                    <div className="mt-2 flex items-center justify-between w-full text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span className="font-medium truncate max-w-xs">{ev.name}</span>
                      <a
                        href={ev.url}
                        download={ev.name}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        Unduh File
                      </a>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="border border-slate-200 rounded-lg p-3">
              <span className="font-bold text-slate-800 block mb-1">Catatan Penggantian / Keterangan</span>
              <p className="text-slate-600">{getCleanDesc(detailModal.description)}</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailModal(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Pop Up Layar Blur Zoomable Bukti Evidence */}
      {previewEvidence && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md select-none animate-in fade-in duration-200"
          onClick={(e) => {
            // Tutup jika klik area latar belakang yang blur
            if (e.target === e.currentTarget) setPreviewEvidence(null);
          }}
        >
          {/* Top Left File Title Pill */}
          <div className="absolute top-5 left-5 z-20 hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-slate-200/80 text-xs font-semibold text-slate-800 max-w-md truncate">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="truncate">{previewEvidence.name}</span>
          </div>

          {/* Top Right Action Buttons (Unduh & Tutup) */}
          <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
            <a
              href={previewEvidence.url}
              download={previewEvidence.name}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 bg-white/90 hover:bg-white text-slate-700 hover:text-blue-600 rounded-full text-xs font-semibold shadow-lg backdrop-blur-md border border-slate-200/80 transition-all flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Unduh / Buka</span>
            </a>

            <button
              type="button"
              onClick={() => setPreviewEvidence(null)}
              title="Tutup (Esc)"
              className="p-2 rounded-full bg-white/90 hover:bg-rose-50 text-slate-700 hover:text-rose-600 shadow-lg backdrop-blur-md border border-slate-200/80 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Centered Interactive Zoomable Viewport */}
          <div
            className={`relative max-w-full max-h-full flex items-center justify-center ${
              isDragging ? 'cursor-grabbing' : zoomScale > 1 ? 'cursor-grab' : 'cursor-zoom-in'
            }`}
            onWheel={(e) => {
              e.preventDefault();
              if (e.deltaY < 0) {
                setZoomScale((s) => Math.min(+(s + 0.2).toFixed(2), 4));
              } else {
                setZoomScale((s) => Math.max(+(s - 0.2).toFixed(2), 0.5));
              }
            }}
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              setIsDragging(true);
              setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
            }}
            onMouseMove={(e) => {
              if (!isDragging) return;
              setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
              });
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onDoubleClick={() => {
              if (zoomScale > 1) {
                resetZoom();
              } else {
                setZoomScale(2);
              }
            }}
          >
            <img
              src={previewEvidence.url}
              alt={previewEvidence.name}
              draggable={false}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoomScale}) rotate(${zoomRotation}deg)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                maxWidth: '85vw',
                maxHeight: '78vh',
              }}
              className="object-contain rounded-2xl shadow-2xl bg-white/95 p-2.5 border border-white/70 select-none pointer-events-none"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).alt = 'Format dokumen tidak dapat ditampilkan langsung. Silakan gunakan tombol Unduh / Buka.';
              }}
            />
          </div>

          {/* Bottom Floating Glassmorphism Zoom Bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3.5 py-1.5 bg-white/90 hover:bg-white backdrop-blur-md rounded-full shadow-2xl border border-slate-200/90 transition-all text-slate-700">
            <button
              type="button"
              onClick={() => setZoomScale((s) => Math.max(+(s - 0.25).toFixed(2), 0.5))}
              disabled={zoomScale <= 0.5}
              title="Zoom Out (-)"
              className="w-7 h-7 flex items-center justify-center text-sm font-bold rounded-full hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-40"
            >
              −
            </button>

            <button
              type="button"
              onClick={resetZoom}
              title="Klik untuk reset zoom (100%)"
              className="px-2.5 py-0.5 text-xs font-mono font-bold text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50 transition-colors"
            >
              {Math.round(zoomScale * 100)}%
            </button>

            <button
              type="button"
              onClick={() => setZoomScale((s) => Math.min(+(s + 0.25).toFixed(2), 4))}
              disabled={zoomScale >= 4}
              title="Zoom In (+)"
              className="w-7 h-7 flex items-center justify-center text-sm font-bold rounded-full hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-40"
            >
              +
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1" />

            <button
              type="button"
              onClick={resetZoom}
              title="Reset Ukuran (100%)"
              className="px-2.5 py-1 text-xs font-semibold rounded-full hover:bg-slate-100 transition-colors flex items-center gap-1"
            >
              ⟲ Reset
            </button>

            <button
              type="button"
              onClick={() => setZoomRotation((r) => (r + 90) % 360)}
              title="Putar 90 Derajat (R)"
              className="px-2.5 py-1 text-xs font-semibold rounded-full hover:bg-slate-100 transition-colors flex items-center gap-1"
            >
              ↻ 90°
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

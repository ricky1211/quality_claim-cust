'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, session, fmtDate, fmtRp, yearOptions } from '@/lib/api';
import { Badge, Modal, Tabs } from '@/components/ui';

const STATUSES = ['INVESTIGASI', 'DISETUJUI', 'DITOLAK', 'SELESAI'];
const EMPTY = { date: new Date().toISOString().slice(0, 10), claimNo: '', category: 'FG', customerId: '', productId: '', complaintId: '', qty: '', amount: '', description: '' };

export default function ClaimsPage() {
  const user = session.user();
  const [year, setYear] = useState(new Date().getFullYear());
  const [category, setCategory] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setRows(await api.get(`/claims?year=${year}${category ? `&category=${category}` : ''}`));
  }, [year, category]);

  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);
  useEffect(() => { Promise.all([api.get('/master/customers'), api.get('/master/products')]).then(([c, p]) => { setCustomers(c); setProducts(p); }); }, []);

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });
  const role = user?.role;
  const canCreate = role === 'ADMIN' || ['QC_STAFF', 'QC_SUPERVISOR', 'MARKETING'].includes(role!);
  const canStatus = role === 'ADMIN' || ['QC_SUPERVISOR', 'MANAGER'].includes(role!);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      await api.post('/claims', {
        ...form, claimNo: form.claimNo || undefined, complaintId: form.complaintId ? +form.complaintId : undefined,
        customerId: +form.customerId, productId: +form.productId, qty: +form.qty, amount: +form.amount,
      });
      setOpen(false); setForm(EMPTY); load();
    } catch (err: any) { setError(err.message); }
  }

  async function changeStatus(id: number, status: string) {
    try { await api.patch(`/claims/${id}/status`, { status }); load(); } catch (err: any) { setError(err.message); }
  }

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Database klaim</h1>
          <p className="text-sm text-steel">{rows.length} klaim · total {fmtRp(total)}</p>
        </div>
        <div className="flex items-center gap-2">
          <select aria-label="Tahun" className="field !w-auto" value={year} onChange={(e) => setYear(+e.target.value)}>{yearOptions().map((y) => <option key={y}>{y}</option>)}</select>
          {canCreate && <button className="btn-primary" onClick={() => setOpen(true)}>Catat klaim</button>}
        </div>
      </div>

      <Tabs value={category} onChange={setCategory}
        items={[{ value: '', label: 'Semua' }, { value: 'FG', label: 'Finished Goods (FG)' }, { value: 'NON_FORGING', label: 'Non-Forging' }]} />

      {error && <p role="alert" className="rounded bg-orange-50 px-3 py-2 text-sm text-forge">{error}</p>}

      <div className="overflow-x-auto rounded-md border border-line bg-white">
        <table className="w-full min-w-[900px]">
          <thead className="border-b border-line bg-mist/60">
            <tr>{['Tanggal', 'No klaim', 'Kategori', 'Customer', 'Produk / part', 'Qty', 'Nilai klaim', 'Status'].map((h) => <th key={h} className="th">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && <tr><td colSpan={8} className="td py-10 text-center text-steel">Belum ada klaim pada tahun ini.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="td whitespace-nowrap">{fmtDate(r.date)}</td>
                <td className="td font-medium">{r.claimNo}{r.complaint && <span className="block text-xs font-normal text-steel">Ref: {r.complaint.docNo}</span>}</td>
                <td className="td">{r.category === 'FG' ? 'FG' : 'Non-Forging'}</td>
                <td className="td">{r.customer.name}</td>
                <td className="td">{r.product.name}<br /><span className="text-xs text-steel">{r.product.partNo}</span></td>
                <td className="td text-right tabular-nums">{r.qty}</td>
                <td className="td text-right tabular-nums">{fmtRp(r.amount)}</td>
                <td className="td">
                  {canStatus
                    ? <select aria-label="Ubah status" className="field !w-auto !py-1" value={r.status} onChange={(e) => changeStatus(r.id, e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}</select>
                    : <Badge value={r.status} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title="Catat klaim" onClose={() => setOpen(false)}>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Tanggal</label><input className="field" type="date" required value={form.date} onChange={set('date')} /></div>
            <div><label className="label">Kategori</label>
              <select className="field" value={form.category} onChange={set('category')}><option value="FG">Finished Goods (FG)</option><option value="NON_FORGING">Non-Forging</option></select></div>
            <div><label className="label">Customer</label>
              <select className="field" required value={form.customerId} onChange={set('customerId')}><option value="">Pilih customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="label">Produk / part</label>
              <select className="field" required value={form.productId} onChange={set('productId')}><option value="">Pilih produk</option>{products.map((p) => <option key={p.id} value={p.id}>{p.partNo} — {p.name}</option>)}</select></div>
            <div><label className="label">Qty (pcs)</label><input className="field" type="number" min={0} required value={form.qty} onChange={set('qty')} /></div>
            <div><label className="label">Nilai klaim (Rp)</label><input className="field" type="number" min={0} required value={form.amount} onChange={set('amount')} /></div>
            <div><label className="label">No klaim (kosongkan untuk otomatis)</label><input className="field" value={form.claimNo} onChange={set('claimNo')} /></div>
            <div><label className="label">ID komplain terkait (opsional)</label><input className="field" type="number" value={form.complaintId} onChange={set('complaintId')} /></div>
            <div className="sm:col-span-2"><label className="label">Keterangan</label><textarea className="field" rows={3} value={form.description} onChange={set('description')} /></div>
            {error && <p role="alert" className="text-sm text-forge sm:col-span-2">{error}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Batal</button>
              <button className="btn-primary">Simpan klaim</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

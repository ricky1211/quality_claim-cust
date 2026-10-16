'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, session, MONTHS, fmtDate, yearOptions } from '@/lib/api';
import { Badge, Modal, Tabs } from '@/components/ui';

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = { date: today(), docNo: '', customerId: '', productId: '', defectType: '', rejectQty: '', picId: '', description: '' };

export default function ComplaintsPage() {
  const user = session.user();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(0); // 0 = semua bulan
  const [rows, setRows] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setRows(await api.get(`/complaints?year=${year}${month ? `&month=${month}` : ''}`));
  }, [year, month]);

  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);
  useEffect(() => {
    Promise.all([api.get('/master/customers'), api.get('/master/products'), api.get('/master/users')])
      .then(([c, p, u]) => { setCustomers(c); setProducts(p); setUsers(u); });
  }, []);

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/complaints', {
        ...form,
        docNo: form.docNo || undefined,
        customerId: +form.customerId, productId: +form.productId, picId: +form.picId, rejectQty: +form.rejectQty,
      });
      setOpen(false); setForm(EMPTY); load();
    } catch (err: any) { setError(err.message); }
  }

  async function act(id: number, action: string) {
    const note = action === 'reject' ? prompt('Alasan penolakan:') : undefined;
    if (action === 'reject' && !note) return;
    try { await api.post(`/complaints/${id}/${action}`, { note }); load(); } catch (err: any) { setError(err.message); }
  }

  const role = user?.role;
  const can = (...r: string[]) => role === 'ADMIN' || (role && r.includes(role));

  function actions(r: any) {
    const out: [string, string, string][] = [];
    if (r.approvalStatus === 'DRAFT' && can('QC_STAFF')) out.push(['prepare', 'Ajukan', 'btn-primary']);
    if (r.approvalStatus === 'PREPARED' && can('QC_SUPERVISOR')) out.push(['check', 'Periksa', 'btn-primary'], ['reject', 'Tolak', 'btn-danger']);
    if (r.approvalStatus === 'CHECKED' && can('MANAGER')) out.push(['approve', 'Setujui', 'btn-primary'], ['reject', 'Tolak', 'btn-danger']);
    if (r.approvalStatus === 'APPROVED' && r.caseStatus === 'OPEN' && can('QC_STAFF', 'QC_SUPERVISOR')) out.push(['close', 'Tutup kasus', 'btn-ghost']);
    return out;
  }

  const totalReject = rows.reduce((s, r) => s + r.rejectQty, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Komplain harian pelanggan</h1>
          <p className="text-sm text-steel">{rows.length} komplain · {totalReject.toLocaleString('id-ID')} pcs reject</p>
        </div>
        <div className="flex items-center gap-2">
          <select aria-label="Tahun" className="field !w-auto" value={year} onChange={(e) => setYear(+e.target.value)}>
            {yearOptions().map((y) => <option key={y}>{y}</option>)}
          </select>
          <button className="btn-ghost" onClick={() => api.download(`/complaints/export?year=${year}${month ? `&month=${month}` : ''}`, `komplain-${year}${month ? '-' + month : ''}.xlsx`)}>Unduh Excel</button>
          {can('QC_STAFF', 'MARKETING') && <button className="btn-primary" onClick={() => setOpen(true)}>Catat komplain</button>}
        </div>
      </div>

      <Tabs value={month} onChange={setMonth}
        items={[{ value: 0, label: 'Semua' }, ...MONTHS.map((m, i) => ({ value: i + 1, label: m }))]} />

      {error && <p role="alert" className="rounded bg-orange-50 px-3 py-2 text-sm text-forge">{error}</p>}

      <div className="overflow-x-auto rounded-md border border-line bg-white">
        <table className="w-full min-w-[1000px]">
          <thead className="border-b border-line bg-mist/60">
            <tr>{['Tanggal', 'No dokumen', 'Customer', 'Produk / part', 'Jenis cacat', 'Reject', 'PIC', 'Persetujuan', 'Kasus', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && <tr><td colSpan={10} className="td py-10 text-center text-steel">Belum ada komplain pada periode ini. Pilih “Catat komplain” untuk menambahkan.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="td whitespace-nowrap">{fmtDate(r.date)}</td>
                <td className="td font-medium">{r.docNo}</td>
                <td className="td">{r.customer.name}</td>
                <td className="td">{r.product.name}<br /><span className="text-xs text-steel">{r.product.partNo}</span></td>
                <td className="td">{r.defectType}</td>
                <td className="td text-right tabular-nums">{r.rejectQty}</td>
                <td className="td">{r.pic.name}</td>
                <td className="td">
                  <Badge value={r.approvalStatus} />
                  <p className="mt-1 text-xs text-steel">
                    {r.preparedBy && <>P: {r.preparedBy.name}<br /></>}
                    {r.checkedBy && <>C: {r.checkedBy.name}<br /></>}
                    {r.approvedBy && <>A: {r.approvedBy.name}</>}
                  </p>
                  {r.rejectNote && <p className="mt-1 text-xs text-forge">Ditolak: {r.rejectNote}</p>}
                </td>
                <td className="td"><Badge value={r.caseStatus} /></td>
                <td className="td"><div className="flex flex-wrap gap-1">{actions(r).map(([a, l, c]) => <button key={a} className={c} onClick={() => act(r.id, a)}>{l}</button>)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title="Catat komplain pelanggan" onClose={() => setOpen(false)}>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Tanggal</label><input className="field" type="date" required value={form.date} onChange={set('date')} /></div>
            <div><label className="label">No dokumen (kosongkan untuk otomatis)</label><input className="field" value={form.docNo} onChange={set('docNo')} /></div>
            <div><label className="label">Customer</label>
              <select className="field" required value={form.customerId} onChange={set('customerId')}><option value="">Pilih customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="label">Produk / part</label>
              <select className="field" required value={form.productId} onChange={set('productId')}><option value="">Pilih produk</option>{products.map((p) => <option key={p.id} value={p.id}>{p.partNo} — {p.name}</option>)}</select></div>
            <div><label className="label">Jenis cacat / masalah</label><input className="field" required value={form.defectType} onChange={set('defectType')} /></div>
            <div><label className="label">Jumlah reject (pcs)</label><input className="field" type="number" min={0} required value={form.rejectQty} onChange={set('rejectQty')} /></div>
            <div className="sm:col-span-2"><label className="label">PIC bertanggung jawab</label>
              <select className="field" required value={form.picId} onChange={set('picId')}><option value="">Pilih PIC</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.department}</option>)}</select></div>
            <div className="sm:col-span-2"><label className="label">Keterangan</label><textarea className="field" rows={3} value={form.description} onChange={set('description')} /></div>
            {error && <p role="alert" className="text-sm text-forge sm:col-span-2">{error}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Batal</button>
              <button className="btn-primary">Simpan komplain</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

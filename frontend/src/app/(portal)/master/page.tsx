'use client';
import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, session } from '@/lib/api';
import { Modal } from '@/components/ui';

function MasterTabWatcher({ onTab }: { onTab: (tab: string | null) => void }) {
  const searchParams = useSearchParams();
  const t = searchParams.get('tab');
  useEffect(() => {
    onTab(t);
  }, [t, onTab]);
  return null;
}

export default function MasterPage() {
  const user = session.user();
  const [activeTab, setActiveTab] = useState<'customer' | 'product' | 'user' | 'checklist'>('customer');
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([
    { id: 1, code: 'FMEA', name: 'Failure Mode and Effects Analysis', dept: 'Engineering / QA', required: true },
    { id: 2, code: 'ECN', name: 'Engineering Change Notice', dept: 'Engineering', required: true },
    { id: 3, code: 'CP', name: 'Control Plan', dept: 'Quality Assurance', required: true },
    { id: 4, code: 'CS', name: 'Control Sheet / Check Sheet', dept: 'Produksi', required: true },
    { id: 5, code: 'MPS', name: 'Manufacturing Process Standard', dept: 'Engineering', required: false },
    { id: 6, code: 'EOS', name: 'Element of Standard Operation', dept: 'Produksi', required: false },
  ]);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [custForm, setCustForm] = useState({ name: '' });
  const [prodForm, setProdForm] = useState({ partNo: '', name: '' });
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [c, p, u] = await Promise.all([
        api.get('/master/customers'),
        api.get('/master/products'),
        api.get('/master/users'),
      ]);
      setCustomers(c);
      setProducts(p);
      setUsers(u);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/master/customers', custForm);
      setModalOpen(false);
      setCustForm({ name: '' });
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/master/products', prodForm);
      setModalOpen(false);
      setProdForm({ partNo: '', name: '' });
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const roleBadge: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-800',
    MANAGER: 'bg-indigo-100 text-indigo-800',
    QC_SUPERVISOR: 'bg-blue-100 text-blue-800',
    QC_STAFF: 'bg-emerald-100 text-emerald-800',
    PRODUKSI: 'bg-amber-100 text-amber-800',
    MARKETING: 'bg-sky-100 text-sky-800',
  };

  const handleTab = useCallback((t: string | null) => {
    if (t === 'user') setActiveTab('user');
    else if (t === 'customer' || t === 'product') setActiveTab('customer');
  }, []);

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <MasterTabWatcher onTab={handleTab} />
      </Suspense>
      {/* Tab Switcher & Action Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setActiveTab('customer'); setSearch(''); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'customer'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Master Customer ({customers.length})
          </button>
          <button
            onClick={() => { setActiveTab('product'); setSearch(''); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'product'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Master Part Name ({products.length})
          </button>
          <button
            onClick={() => { setActiveTab('user'); setSearch(''); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'user'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            User & Role Management ({users.length})
          </button>
          <button
            onClick={() => { setActiveTab('checklist'); setSearch(''); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'checklist'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Master Checklist Dokumen ({checklists.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Cari data..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
          />
          {(activeTab === 'customer' || activeTab === 'product') && (
            <button
              onClick={() => { setError(''); setModalOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Tambah {activeTab === 'customer' ? 'Customer' : 'Part'}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* Tab 1: Master Customer */}
      {activeTab === 'customer' && (
        <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase">
                <th className="py-1.5 px-2.5 w-12 text-center border border-slate-300">ID</th>
                <th className="py-1.5 px-2.5 border border-slate-300">Nama Pelanggan / Customer</th>
                <th className="py-1.5 px-2.5 w-32 text-center border border-slate-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {customers
                .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
                .map((c) => (
                  <tr key={c.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/50 transition-colors">
                    <td className="py-1.5 px-2.5 text-center text-slate-400 font-mono border border-slate-200">#{c.id}</td>
                    <td className="py-1.5 px-2.5 font-semibold text-slate-800 border border-slate-200">{c.name}</td>
                    <td className="py-1.5 px-2.5 text-center border border-slate-200">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Aktif
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Master Part Name */}
      {activeTab === 'product' && (
        <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase">
                <th className="py-1.5 px-2.5 w-12 text-center border border-slate-300">ID</th>
                <th className="py-1.5 px-2.5 border border-slate-300">Part Number</th>
                <th className="py-1.5 px-2.5 border border-slate-300">Part Name</th>
                <th className="py-1.5 px-2.5 w-32 text-center border border-slate-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {products
                .filter(
                  (p) =>
                    !search ||
                    p.partNo.toLowerCase().includes(search.toLowerCase()) ||
                    p.name.toLowerCase().includes(search.toLowerCase())
                )
                .map((p) => (
                  <tr key={p.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/50 transition-colors">
                    <td className="py-1.5 px-2.5 text-center text-slate-400 font-mono border border-slate-200">#{p.id}</td>
                    <td className="py-1.5 px-2.5 font-mono font-semibold text-slate-900 border border-slate-200">{p.partNo}</td>
                    <td className="py-1.5 px-2.5 text-slate-700 border border-slate-200">{p.name}</td>
                    <td className="py-1.5 px-2.5 text-center border border-slate-200">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Aktif
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Master Users & Role Management */}
      {activeTab === 'user' && (
        <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase">
                <th className="py-1.5 px-2.5 w-12 text-center border border-slate-300">ID</th>
                <th className="py-1.5 px-2.5 border border-slate-300">Nama Karyawan</th>
                <th className="py-1.5 px-2.5 border border-slate-300">Departemen</th>
                <th className="py-1.5 px-2.5 border border-slate-300">Role / Wewenang Approval</th>
                <th className="py-1.5 px-2.5 w-32 text-center border border-slate-300">Status Akun</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter(
                  (u) =>
                    !search ||
                    u.name.toLowerCase().includes(search.toLowerCase()) ||
                    u.department.toLowerCase().includes(search.toLowerCase()) ||
                    u.role.toLowerCase().includes(search.toLowerCase())
                )
                .map((u) => (
                  <tr key={u.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/50 transition-colors">
                    <td className="py-1.5 px-2.5 text-center text-slate-400 font-mono border border-slate-200">#{u.id}</td>
                    <td className="py-1.5 px-2.5 font-semibold text-slate-800 border border-slate-200">{u.name}</td>
                    <td className="py-1.5 px-2.5 text-slate-600 border border-slate-200">{u.department}</td>
                    <td className="py-1.5 px-2.5 border border-slate-200">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${roleBadge[u.role] || 'bg-slate-100 text-slate-700'}`}>
                        {u.role === 'QC_STAFF' ? 'PIC QA (Prepare)' : u.role === 'QC_SUPERVISOR' ? 'SPV QA (Check)' : u.role === 'MANAGER' ? 'Manager QA (Approve)' : u.role}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 text-center border border-slate-200">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Aktif
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Master Checklist Dokumen */}
      {activeTab === 'checklist' && (
        <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase">
                <th className="py-1.5 px-2.5 w-16 text-center border border-slate-300">Kode</th>
                <th className="py-1.5 px-2.5 border border-slate-300">Nama Dokumen Mutu</th>
                <th className="py-1.5 px-2.5 border border-slate-300">Departemen Terkait</th>
                <th className="py-1.5 px-2.5 w-32 text-center border border-slate-300">Kewajiban</th>
              </tr>
            </thead>
            <tbody>
              {checklists
                .filter(
                  (c) =>
                    !search ||
                    c.code.toLowerCase().includes(search.toLowerCase()) ||
                    c.name.toLowerCase().includes(search.toLowerCase())
                )
                .map((c) => (
                  <tr key={c.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/50 transition-colors">
                    <td className="py-1.5 px-2.5 text-center font-bold text-blue-600 font-mono border border-slate-200">{c.code}</td>
                    <td className="py-1.5 px-2.5 font-semibold text-slate-800 border border-slate-200">{c.name}</td>
                    <td className="py-1.5 px-2.5 text-slate-600 border border-slate-200">{c.dept}</td>
                    <td className="py-1.5 px-2.5 text-center border border-slate-200">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.required
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c.required ? 'Wajib Diperiksa' : 'Opsional'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {modalOpen && (
        <Modal
          title={`Tambah ${activeTab === 'customer' ? 'Customer' : 'Part Name'}`}
          onClose={() => setModalOpen(false)}
        >
          {activeTab === 'customer' ? (
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nama Pelanggan / Customer (Contoh: AHM, ADM, KYB)
                </label>
                <input
                  type="text"
                  required
                  value={custForm.name}
                  onChange={(e) => setCustForm({ name: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Masukkan nama customer..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                >
                  Simpan Customer
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Part Number (Contoh: 53205-K1A-N000)
                </label>
                <input
                  type="text"
                  required
                  value={prodForm.partNo}
                  onChange={(e) => setProdForm({ ...prodForm, partNo: e.target.value })}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Nomor part..."
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Part Name (Contoh: ST. STEM K1AL, HUB FRONT D80N)
                </label>
                <input
                  type="text"
                  required
                  value={prodForm.name}
                  onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Nama part..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                >
                  Simpan Part
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}

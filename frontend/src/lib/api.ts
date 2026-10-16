const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type Role = 'ADMIN' | 'QC_STAFF' | 'QC_SUPERVISOR' | 'MANAGER' | 'PRODUKSI' | 'MARKETING';
export type User = { id: number; name: string; role: Role; department: string };

export const session = {
  token: () => (typeof window === 'undefined' ? null : localStorage.getItem('qc_token')),
  user: (): User | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('qc_user');
    return raw ? JSON.parse(raw) : null;
  },
  save: (token: string, user: User) => { localStorage.setItem('qc_token', token); localStorage.setItem('qc_user', JSON.stringify(user)); },
  clear: () => { localStorage.removeItem('qc_token'); localStorage.removeItem('qc_user'); },
};

async function request(path: string, init: RequestInit = {}) {
  const token = session.token();
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...init.headers },
  });
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    session.clear();
    window.location.href = '/login';
    throw new Error('Sesi berakhir, silakan masuk kembali');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(msg || `Permintaan gagal (${res.status})`);
  }
  return res;
}

export const api = {
  get: async <T = any>(path: string): Promise<T> => (await request(path)).json(),
  post: async <T = any>(path: string, body?: unknown): Promise<T> => (await request(path, { method: 'POST', body: JSON.stringify(body ?? {}) })).json(),
  patch: async <T = any>(path: string, body: unknown): Promise<T> => (await request(path, { method: 'PATCH', body: JSON.stringify(body) })).json(),
  download: async (path: string, filename: string) => {
    const blob = await (await request(path)).blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
export const fmtRp = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID');
export const yearOptions = () => { const y = new Date().getFullYear(); return Array.from({ length: 6 }, (_, i) => y + 1 - i); };

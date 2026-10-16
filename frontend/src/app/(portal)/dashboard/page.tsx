'use client';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, fmtRp, MONTHS, yearOptions } from '@/lib/api';

const STATUS_LABEL: Record<string, string> = { INVESTIGASI: 'Investigasi', DISETUJUI: 'Disetujui', DITOLAK: 'Ditolak', SELESAI: 'Selesai' };

export default function DashboardPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => { api.get(`/dashboard?year=${year}`).then(setData).catch((e) => setError(e.message)); }, [year]);

  if (error) return <p role="alert" className="text-forge">{error}</p>;
  if (!data) return <p className="text-steel">Memuat data…</p>;

  const trend = data.trend.map((t: any) => ({ ...t, name: MONTHS[t.month - 1] }));
  const total = data.kpi.open + data.kpi.closed;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard komplain {year}</h1>
        <select aria-label="Tahun" className="field !w-auto" value={year} onChange={(e) => setYear(+e.target.value)}>{yearOptions().map((y) => <option key={y}>{y}</option>)}</select>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ['Total komplain', total, ''],
          ['Masih open', data.kpi.open, 'text-forge'],
          ['Sudah closed', data.kpi.closed, 'text-teal'],
          ['Total reject (pcs)', data.kpi.totalReject.toLocaleString('id-ID'), ''],
        ].map(([l, v, c]) => (
          <div key={l as string} className="rounded-md border border-line bg-white p-4">
            <p className="text-xs text-steel">{l}</p>
            <p className={`mt-1 text-3xl font-semibold tabular-nums ${c}`}>{v}</p>
          </div>
        ))}
      </div>

      <section className="rounded-md border border-line bg-white p-4">
        <h2 className="mb-3 font-semibold">Tren komplain per bulan</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={trend}>
              <CartesianGrid stroke="#D5DBE0" strokeDasharray="3 3" />
              <XAxis dataKey="name" /><YAxis yAxisId="l" allowDecimals={false} /><YAxis yAxisId="r" orientation="right" />
              <Tooltip /><Legend />
              <Line yAxisId="l" dataKey="cases" name="Jumlah komplain" stroke="#0F6E7A" strokeWidth={2} />
              <Line yAxisId="r" dataKey="reject" name="Qty reject" stroke="#C8501E" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-4">
        <h2 className="mb-1 font-semibold">Pareto jenis cacat</h2>
        <p className="mb-3 text-sm text-steel">Jenis cacat diurutkan dari qty reject terbesar; garis menunjukkan persentase kumulatif.</p>
        <div className="h-72">
          <ResponsiveContainer>
            <ComposedChart data={data.pareto}>
              <CartesianGrid stroke="#D5DBE0" strokeDasharray="3 3" />
              <XAxis dataKey="defectType" interval={0} tick={{ fontSize: 11 }} /><YAxis yAxisId="l" />
              <YAxis yAxisId="r" orientation="right" domain={[0, 100]} unit="%" />
              <Tooltip /><Legend />
              <Bar yAxisId="l" dataKey="rejectQty" name="Qty reject" fill="#0F6E7A" />
              <Line yAxisId="r" dataKey="cumPct" name="Kumulatif %" stroke="#C8501E" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-line bg-white p-4">
          <h2 className="mb-3 font-semibold">5 produk dengan reject terbanyak</h2>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={data.topProducts} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid stroke="#D5DBE0" strokeDasharray="3 3" />
                <XAxis type="number" /><YAxis type="category" dataKey="product" width={110} tick={{ fontSize: 11 }} />
                <Tooltip /><Bar dataKey="rejectQty" name="Qty reject" fill="#16222C" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-md border border-line bg-white p-4">
          <h2 className="mb-3 font-semibold">Status klaim</h2>
          <table className="w-full text-sm">
            <thead><tr><th className="th">Status</th><th className="th text-right">Jumlah</th><th className="th text-right">Nilai</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.claims.length === 0 && <tr><td colSpan={3} className="td text-center text-steel">Belum ada klaim.</td></tr>}
              {data.claims.map((c: any) => (
                <tr key={c.status}><td className="td">{STATUS_LABEL[c.status]}</td><td className="td text-right tabular-nums">{c.count}</td><td className="td text-right tabular-nums">{fmtRp(c.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

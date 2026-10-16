'use client';
import { ReactNode } from 'react';

const TONES: Record<string, string> = {
  DRAFT: 'bg-slate-200 text-slate-700',
  PREPARED: 'bg-amber-100 text-amber-800',
  CHECKED: 'bg-sky-100 text-sky-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  OPEN: 'bg-orange-100 text-forge',
  CLOSED: 'bg-emerald-100 text-emerald-800',
  INVESTIGASI: 'bg-amber-100 text-amber-800',
  DISETUJUI: 'bg-sky-100 text-sky-800',
  DITOLAK: 'bg-red-100 text-red-700',
  SELESAI: 'bg-emerald-100 text-emerald-800',
};
const LABELS: Record<string, string> = {
  DRAFT: 'Draft', PREPARED: 'Prepared', CHECKED: 'Checked', APPROVED: 'Approved',
  OPEN: 'Open', CLOSED: 'Closed', INVESTIGASI: 'Investigasi', DISETUJUI: 'Disetujui', DITOLAK: 'Ditolak', SELESAI: 'Selesai',
};

export function Badge({ value }: { value: string }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${TONES[value] ?? 'bg-slate-100'}`}>{LABELS[value] ?? value}</span>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="mt-10 w-full max-w-2xl rounded-md bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button className="text-steel hover:text-ink" onClick={onClose} aria-label="Tutup">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Tabs({ items, value, onChange }: { items: { value: any; label: string }[]; value: any; onChange: (v: any) => void }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 border-b border-line">
      {items.map((t) => (
        <button key={String(t.value)} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm ${value === t.value ? 'border-teal font-semibold text-teal' : 'border-transparent text-steel hover:text-ink'}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

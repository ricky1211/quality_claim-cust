'use client';
import { ReactNode } from 'react';

const TONES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  PREPARED: 'bg-amber-50 text-amber-700 border-amber-200',
  CHECKED: 'bg-blue-50 text-blue-700 border-blue-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
  CLOSED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INVESTIGASI: 'bg-amber-50 text-amber-700 border-amber-200',
  DISETUJUI: 'bg-blue-50 text-blue-700 border-blue-200',
  DITOLAK: 'bg-rose-50 text-rose-700 border-rose-200',
  SELESAI: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PREPARED: 'Prepared',
  CHECKED: 'Checked',
  APPROVED: 'Approved',
  OPEN: 'Proses (Open)',
  CLOSED: 'Selesai (Closed)',
  INVESTIGASI: 'Investigasi',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
  SELESAI: 'Lunas / Selesai',
};

export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-block rounded-lg border px-2.5 py-0.5 text-[11px] font-bold ${
        TONES[value] ?? 'bg-slate-50 text-slate-700 border-slate-200'
      }`}
    >
      {LABELS[value] ?? value}
    </span>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="mt-10 w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <button
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
            onClick={onClose}
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { value: any; label: string }[];
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <div role="tablist" className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
      {items.map((t) => (
        <button
          key={String(t.value)}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            value === t.value
              ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/20'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

import './globals.css';
import type { Metadata } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';

const plex = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex' });

export const metadata: Metadata = { title: 'Portal Mutu — Komplain & Klaim', description: 'Portal komplain pelanggan dan klaim' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={plex.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}

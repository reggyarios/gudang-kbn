import './globals.css';
import { Figtree } from 'next/font/google';

const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree' });

export const metadata = { title: 'Gudang KBN', description: 'Sistem manajemen stok dan transaksi gudang' };

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={figtree.variable}>
      <body className="min-h-screen bg-stone-100 font-sans text-stone-900 antialiased">{children}</body>
    </html>
  );
}

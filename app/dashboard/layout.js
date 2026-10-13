'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Package, History, Users, LogOut, Warehouse, Menu, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const nav = [
  { href: '/dashboard', label: 'Ringkasan', icon: LayoutDashboard },
  { href: '/dashboard/items', label: 'Barang', icon: Package },
  { href: '/dashboard/transactions', label: 'Transaksi', icon: History },
  { href: '/dashboard/users', label: 'Pengguna', icon: Users },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const path = usePathname();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');
      const { data: p } = await supabase.from('profiles').select('email, role').eq('id', session.user.id).single();
      if (p?.role !== 'admin') {
        await supabase.auth.signOut();
        return router.replace('/login?error=forbidden');
      }
      setEmail(p.email || session.user.email);
      setReady(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => { if (evt === 'SIGNED_OUT') router.replace('/login'); });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  const logout = async () => { await supabase.auth.signOut(); router.replace('/login'); };

  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-stone-500">Memeriksa akses...</div>;

  return (
    <div className="min-h-screen lg:flex">
      <aside className={`${open ? 'flex' : 'hidden'} fixed inset-0 z-20 w-64 flex-col bg-ink text-stone-300 lg:static lg:flex lg:min-h-screen`}>
        <div className="flex items-center gap-3 px-5 py-5 text-white">
          <Warehouse className="text-amber-500" />
          <span className="font-bold">Gudang KBN</span>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup menu"><X size={18} /></button>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = path === href;
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${active ? 'bg-amber-600 text-white' : 'hover:bg-white/10'}`}>
                <Icon size={18} /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-xs text-stone-400">{email}</p>
          <button onClick={logout} className="mt-2 flex items-center gap-2 text-sm hover:text-white"><LogOut size={16} /> Keluar</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Buka menu"><Menu /></button>
          <span className="font-bold">Gudang KBN</span>
        </header>
        <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}

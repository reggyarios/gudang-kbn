'use client';
import { useEffect, useState } from 'react';
import { Boxes, ArrowDownToLine, ArrowUpFromLine, History } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function Overview() {
  const [items, setItems] = useState([]);
  const [tx, setTx] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [a, b] = await Promise.all([
        supabase.from('items').select('*').order('sku'),
        supabase.from('transactions').select('transaction_type, type, quantity'),
      ]);
      if (a.error || b.error) return setError((a.error || b.error).message);
      setItems(a.data || []); 
      setTx(b.data || []);
    })();
  }, []);

  const sum = (t) => tx.filter((x) => (x.transaction_type || x.type || '').toLowerCase() === t.toLowerCase()).reduce((n, x) => n + x.quantity, 0);
  
  const stats = [
    { label: 'Total barang', value: items.length, icon: Boxes },
    { label: 'Unit masuk', value: sum('in'), icon: ArrowDownToLine },
    { label: 'Unit keluar', value: sum('out'), icon: ArrowUpFromLine },
    { label: 'Jumlah transaksi', value: tx.length, icon: History },
  ];

  return (
    <>
      <h1 className="text-2xl font-bold">Ringkasan</h1>
      {error && <p className="alert">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card flex items-center gap-4 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-amber-100 text-amber-700"><Icon size={20} /></span>
            <div><p className="text-2xl font-bold leading-none">{value.toLocaleString('id-ID')}</p><p className="mt-1 text-sm text-stone-500">{label}</p></div>
          </div>
        ))}
      </div>
      <section className="card overflow-x-auto">
        <h2 className="px-4 pt-4 font-semibold">Stok terkini</h2>
        <table className="mt-2 w-full">
          <thead className="border-b border-stone-200">
            <tr>
              <th className="th">Kode</th>
              <th className="th">Deskripsi</th>
              <th className="th">Kategori</th>
              <th className="th text-right">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {items.map((i) => (
              <tr key={i.sku || i.item_code}>
                <td className="td font-medium">{i.sku || i.item_code}</td>
                <td className="td">{i.name || i.description}</td>
                <td className="td">{i.category || i.item_group || '-'}</td>
                <td className={`td text-right font-semibold ${(i.saldo || 0) <= 10 ? 'text-red-600' : ''}`}>
                  {i.saldo ?? 0}
                </td>
              </tr>
            ))}
            {!items.length && <tr><td className="td text-stone-500" colSpan={4}>Belum ada barang. Tambahkan lewat menu Barang.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
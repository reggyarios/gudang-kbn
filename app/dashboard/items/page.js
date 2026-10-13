'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const empty = { item_code: '', item_description: '', stock_group: '', current_balance: 0 };

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('items').select('*').order('item_code');
    if (err) setError(err.message); else setItems(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const p = { ...form, current_balance: parseInt(form.current_balance, 10) || 0 };
    const { error: err } = editing
      ? await supabase.from('items').update({ item_description: p.item_description, stock_group: p.stock_group, current_balance: p.current_balance }).eq('item_code', p.item_code)
      : await supabase.from('items').insert(p);
    setBusy(false);
    if (err) return setError(err.message);
    setForm(null); load();
  };

  const remove = async (code) => {
    if (!confirm(`Hapus barang ${code}?`)) return;
    const { error: err } = await supabase.from('items').delete().eq('item_code', code);
    if (err) setError(err.code === '23503' ? `Barang ${code} sudah punya riwayat transaksi dan tidak bisa dihapus.` : err.message);
    else { setError(''); load(); }
  };

  const rows = items.filter((i) => `${i.item_code} ${i.item_description} ${i.stock_group}`.toLowerCase().includes(q.toLowerCase()));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Barang</h1>
        <button className="btn" onClick={() => { setForm(empty); setEditing(false); setError(''); }}><Plus size={16} /> Tambah barang</button>
      </div>
      {error && <p className="alert">{error}</p>}

      {form && (
        <form onSubmit={save} className="card grid gap-3 p-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Kode barang
            <input className="input mt-1 disabled:bg-stone-100" required disabled={editing} value={form.item_code} onChange={set('item_code')} />
          </label>
          <label className="text-sm font-medium">Grup stok
            <input className="input mt-1" value={form.stock_group || ''} onChange={set('stock_group')} />
          </label>
          <label className="text-sm font-medium sm:col-span-2">Deskripsi
            <input className="input mt-1" required value={form.item_description || ''} onChange={set('item_description')} />
          </label>
          <label className="text-sm font-medium">Saldo awal
            <input className="input mt-1" type="number" min="0" value={form.current_balance} onChange={set('current_balance')} />
          </label>
          <div className="flex items-end gap-2 sm:justify-end">
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Batal</button>
            <button className="btn" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      )}

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-3 text-stone-400" />
        <input className="input pl-9" placeholder="Cari kode, deskripsi, atau grup" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-stone-200"><tr><th className="th">Kode</th><th className="th">Deskripsi</th><th className="th">Grup</th><th className="th text-right">Saldo</th><th className="th" /></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((i) => (
              <tr key={i.item_code}>
                <td className="td font-medium">{i.item_code}</td><td className="td">{i.item_description}</td><td className="td">{i.stock_group}</td>
                <td className="td text-right font-semibold">{i.current_balance}</td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    <button className="rounded p-1.5 hover:bg-stone-100" aria-label="Edit" onClick={() => { setForm(i); setEditing(true); setError(''); }}><Pencil size={16} /></button>
                    <button className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label="Hapus" onClick={() => remove(i.item_code)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td className="td text-stone-500" colSpan={5}>Tidak ada barang yang cocok.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

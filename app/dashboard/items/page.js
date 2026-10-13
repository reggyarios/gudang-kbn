'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const empty = { sku: '', name: '', category: '', saldo: 0 };

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('items').select('*').order('sku');
    if (err) setError(err.message); else setItems(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const p = { 
      sku: form.sku,
      item_code: form.sku,
      name: form.name, 
      description: form.name,
      category: form.category, 
      item_group: form.category,
      saldo: parseInt(form.saldo, 10) || 0 
    };

    const { error: err } = editing
      ? await supabase.from('items').update({ 
          name: p.name, 
          description: p.description, 
          category: p.category, 
          item_group: p.item_group, 
          saldo: p.saldo 
        }).eq('sku', p.sku)
      : await supabase.from('items').insert(p);

    setBusy(false);
    if (err) return setError(err.message);
    setForm(null); load();
  };

  const remove = async (sku) => {
    if (!confirm(`Hapus barang ${sku}?`)) return;
    const { error: err } = await supabase.from('items').delete().eq('sku', sku);
    if (err) setError(err.code === '23503' ? `Barang ${sku} sudah punya riwayat transaksi dan tidak bisa dihapus.` : err.message);
    else { setError(''); load(); }
  };

  const rows = items.filter((i) => {
    const code = i.sku || i.item_code || '';
    const desc = i.name || i.description || '';
    const cat = i.category || i.item_group || '';
    return `${code} ${desc} ${cat}`.toLowerCase().includes(q.toLowerCase());
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Barang</h1>
        <button className="btn" onClick={() => { setForm(empty); setEditing(false); setError(''); }}>
          <Plus size={16} /> Tambah barang
        </button>
      </div>
      {error && <p className="alert">{error}</p>}

      {form && (
        <form onSubmit={save} className="card grid gap-3 p-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Kode barang
            <input className="input mt-1 disabled:bg-stone-100" required disabled={editing} value={form.sku} onChange={set('sku')} />
          </label>
          <label className="text-sm font-medium">Grup / Kategori
            <input className="input mt-1" value={form.category || ''} onChange={set('category')} />
          </label>
          <label className="text-sm font-medium sm:col-span-2">Deskripsi
            <input className="input mt-1" required value={form.name || ''} onChange={set('name')} />
          </label>
          <label className="text-sm font-medium">Stock Awal
            <input className="input mt-1" type="number" min="0" value={form.saldo} onChange={set('saldo')} />
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
          <thead className="border-b border-stone-200">
            <tr>
              <th className="th">Kode</th>
              <th className="th">Deskripsi</th>
              <th className="th">Grup</th>
              <th className="th text-right">Stock</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((i) => {
              const code = i.sku || i.item_code;
              const desc = i.name || i.description;
              const cat = i.category || i.item_group || '-';
              const stock = i.saldo ?? 0;
              return (
                <tr key={code}>
                  <td className="td font-medium">{code}</td>
                  <td className="td">{desc}</td>
                  <td className="td">{cat}</td>
                  <td className="td text-right font-semibold">{stock}</td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      <button className="rounded p-1.5 hover:bg-stone-100" aria-label="Edit" onClick={() => { setForm({ sku: code, name: desc, category: cat, saldo: stock }); setEditing(true); setError(''); }}>
                        <Pencil size={16} />
                      </button>
                      <button className="rounded p-1.5 text-red-600 hover:bg-red-50" aria-label="Hapus" onClick={() => remove(code)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td className="td text-stone-500" colSpan={5}>Tidak ada barang yang cocok.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
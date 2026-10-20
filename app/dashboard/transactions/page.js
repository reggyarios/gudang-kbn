'use client';
import { useEffect, useState, useCallback } from 'react';
import { FileSpreadsheet, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { exportTransactions } from '@/lib/exportExcel';

export default function TransactionsPage() {
  const [rows, setRows] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ item_id: '', transaction_type: 'in', quantity: 1, notes: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState('');

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('transactions')
      .select('*, profiles(email), items(id, sku, name, saldo)')
      .order('timestamp', { ascending: false })
      .limit(200);
    if (err) setError(err.message); else setRows(data || []);
  }, []);

  useEffect(() => {
    load();
    supabase.from('items').select('id, sku, name').order('sku').then(({ data }) => setItems(data || []));
    const ch = supabase.channel('tx-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setInfo('');
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Simpan transaksi ke database (Trigger SQL akan otomatis mengupdate saldo items)
    const { error: err } = await supabase.from('transactions').insert({
      item_id: parseInt(form.item_id, 10),
      type: form.transaction_type,
      transaction_type: form.transaction_type,
      quantity: parseInt(form.quantity, 10),
      notes: form.notes || null,
      created_by: user?.id,
    });
    
    setBusy(false);
    if (err) return setError(err.message);
    
    setForm({ item_id: '', transaction_type: 'in', quantity: 1, notes: '' });
    setInfo('Transaksi berhasil dicatat dan stok diperbarui.');
    load();
  };

  // Fungsi DELETE Transaksi dengan Rollback Stok
  const handleDeleteTransaction = async (tx) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus transaksi ini? Stok barang akan dikembalikan otomatis.`)) return;

    setBusy(true); setError(''); setInfo('');

    // 1. Ambil data item terbaru untuk rollback saldo
    const { data: itemData } = await supabase
      .from('items')
      .select('saldo')
      .eq('id', tx.item_id)
      .single();

    if (itemData) {
      const currentSaldo = itemData.saldo || 0;
      const qty = Number(tx.quantity) || 0;
      const txType = (tx.type || tx.transaction_type || '').toLowerCase();

      // Jika dulu 'in' (masuk), saat dihapus stok harus dikurangi.
      // Jika dulu 'out' (keluar), saat dihapus stok harus dikembalikan (ditambah).
      const newSaldo = txType === 'in' 
        ? Math.max(0, currentSaldo - qty) 
        : currentSaldo + qty;

      // Update saldo item
      await supabase.from('items').update({ saldo: newSaldo }).eq('id', tx.item_id);
    }

    // 2. Hapus baris transaksi dari database
    const { error: err } = await supabase.from('transactions').delete().eq('id', tx.id);
    
    setBusy(false);
    if (err) {
      setError(err.message);
    } else {
      setInfo('Transaksi berhasil dihapus dan stok dikembalikan.');
      load();
    }
  };

  const doExport = async (period) => {
    setExporting(period); setError(''); setInfo('');
    try {
      const n = await exportTransactions(period);
      setInfo(`Laporan ${period === 'weekly' ? 'mingguan' : 'bulanan'} diunduh (${n} transaksi).`);
    } catch (err) {
      setError(err.message);
    }
    setExporting('');
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Riwayat transaksi</h1>
        <div className="flex gap-2">
          <button className="btn-ghost" disabled={!!exporting} onClick={() => doExport('weekly')}>
            <FileSpreadsheet size={16} /> {exporting === 'weekly' ? 'Menyiapkan...' : 'Export mingguan'}
          </button>
          <button className="btn-ghost" disabled={!!exporting} onClick={() => doExport('monthly')}>
            <FileSpreadsheet size={16} /> {exporting === 'monthly' ? 'Menyiapkan...' : 'Export bulanan'}
          </button>
        </div>
      </div>
      {error && <p className="alert bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-sm">{error}</p>}
      {info && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{info}</p>}

      <form onSubmit={submit} className="card grid gap-3 p-4 sm:grid-cols-6 bg-white border rounded-xl shadow-sm">
        <select className="input sm:col-span-2 border p-2 rounded-lg text-sm" required value={form.item_id} onChange={set('item_id')}>
          <option value="">Pilih barang</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>{i.sku} - {i.name}</option>
          ))}
        </select>
        <select className="input border p-2 rounded-lg text-sm" value={form.transaction_type} onChange={set('transaction_type')}>
          <option value="in">Masuk</option>
          <option value="out">Keluar</option>
        </select>
        <input className="input border p-2 rounded-lg text-sm" type="number" min="1" required value={form.quantity} onChange={set('quantity')} aria-label="Jumlah" />
        <input className="input border p-2 rounded-lg text-sm" placeholder="Catatan" value={form.notes} onChange={set('notes')} />
        <button className="btn bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium" disabled={busy}>Catat</button>
      </form>

      <div className="card bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500 border-b">
            <tr>
              <th className="p-3">Waktu</th>
              <th className="p-3">Barang</th>
              <th className="p-3">Jenis</th>
              <th className="p-3 text-right">Jumlah</th>
              <th className="p-3">Diinput oleh</th>
              <th className="p-3">Catatan</th>
              <th className="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((t) => {
              const txType = (t.type || t.transaction_type || '').toLowerCase();
              return (
                <tr key={t.id} className="hover:bg-stone-50">
                  <td className="p-3 whitespace-nowrap text-stone-500 text-xs">
                    {new Date(t.timestamp || t.created_at).toLocaleString('id-ID')}
                  </td>
                  <td className="p-3">
                    <span className="font-medium">{t.items?.sku || '-'}</span>
                    <span className="block text-xs text-stone-500">{t.items?.name || t.item_name || '-'}</span>
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${txType === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {txType === 'in' ? 'Masuk' : 'Keluar'}
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold">{t.quantity}</td>
                  <td className="p-3 text-stone-600 text-xs">{t.profiles?.email || '-'}</td>
                  <td className="p-3 text-stone-500 text-xs">{t.notes || '-'}</td>
                  <td className="p-3 text-center">
                    <button 
                      onClick={() => handleDeleteTransaction(t)} 
                      disabled={busy}
                      className="p-1 text-stone-400 hover:text-rose-600 rounded transition" 
                      title="Hapus Transaksi"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td className="p-6 text-center text-stone-400" colSpan={7}>
                  Belum ada transaksi. Catat transaksi pertama di atas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
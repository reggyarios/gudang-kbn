'use client';
import { useEffect, useState, useCallback } from 'react';
import { FileSpreadsheet } from 'lucide-react';
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
      .select('*, profiles(email), items(sku, name)')
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

    // Mengirimkan 'in' atau 'out' dalam huruf kecil sesuai constraint database
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
    load();
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
      {error && <p className="alert">{error}</p>}
      {info && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</p>}

      <form onSubmit={submit} className="card grid gap-3 p-4 sm:grid-cols-6">
        <select className="input sm:col-span-2" required value={form.item_id} onChange={set('item_id')}>
          <option value="">Pilih barang</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>{i.sku} - {i.name}</option>
          ))}
        </select>
        <select className="input" value={form.transaction_type} onChange={set('transaction_type')}>
          <option value="in">Masuk</option>
          <option value="out">Keluar</option>
        </select>
        <input className="input" type="number" min="1" required value={form.quantity} onChange={set('quantity')} aria-label="Jumlah" />
        <input className="input" placeholder="Catatan" value={form.notes} onChange={set('notes')} />
        <button className="btn" disabled={busy}>Catat</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-stone-200">
            <tr>
              <th className="th">Waktu</th>
              <th className="th">Barang</th>
              <th className="th">Jenis</th>
              <th className="th text-right">Jumlah</th>
              <th className="th">Diinput oleh</th>
              <th className="th">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((t) => {
              const txType = (t.type || t.transaction_type || '').toLowerCase();
              return (
                <tr key={t.id}>
                  <td className="td whitespace-nowrap">{new Date(t.timestamp || t.created_at).toLocaleString('id-ID')}</td>
                  <td className="td">
                    <span className="font-medium">{t.items?.sku || '-'}</span>
                    <span className="block text-xs text-stone-500">{t.items?.name || t.item_name || '-'}</span>
                  </td>
                  <td className="td">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${txType === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {txType === 'in' ? 'Masuk' : 'Keluar'}
                    </span>
                  </td>
                  <td className="td text-right font-semibold">{t.quantity}</td>
                  <td className="td">{t.profiles?.email || '-'}</td>
                  <td className="td text-stone-500">{t.notes}</td>
                </tr>
              );
            })}
            {!rows.length && <tr><td className="td text-stone-500" colSpan={6}>Belum ada transaksi. Catat transaksi pertama di atas.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
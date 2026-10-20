'use client';
import { useEffect, useState, useCallback } from 'react';
import { Package, ArrowDownRight, ArrowUpRight, History, Edit2, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState({ totalItems: 0, unitIn: 0, unitOut: 0, totalTx: 0 });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editSaldo, setEditSaldo] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    
    // Fetch items
    const { data: itemsData } = await supabase.from('items').select('*').order('sku');
    // Fetch transactions
    const { data: txData } = await supabase.from('transactions').select('item_id, type, transaction_type, quantity');

    if (itemsData && txData) {
      let unitIn = 0;
      let unitOut = 0;

      // Hitung akumulasi per item dari transaksi
      const txMap = {};
      txData.forEach(t => {
        const type = (t.type || t.transaction_type || '').toLowerCase();
        const qty = Number(t.quantity) || 0;
        if (!txMap[t.item_id]) txMap[t.item_id] = 0;

        if (type === 'in') {
          unitIn += qty;
          txMap[t.item_id] += qty;
        } else if (type === 'out') {
          unitOut += qty;
          txMap[t.item_id] -= qty;
        }
      });

      // Kalkulasi stok terkini: jika saldo DB ada gunakan saldo, jika tidak tambahkan kalkulasi dari transaksi
      const formattedItems = itemsData.map(i => {
        const calculatedStock = (i.saldo !== null && i.saldo !== undefined && i.saldo > 0)
          ? i.saldo 
          : Math.max(0, (txMap[i.id] || 0));
        return { ...i, currentStock: calculatedStock };
      });

      setStats({
        totalItems: itemsData.length,
        unitIn,
        unitOut,
        totalTx: txData.length
      });
      setItems(formattedItems);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateSaldo = async (itemId) => {
    const newStock = parseInt(editSaldo, 10);
    if (isNaN(newStock) || newStock < 0) return;

    const { error } = await supabase.from('items').update({ saldo: newStock }).eq('id', itemId);
    if (!error) {
      setEditingId(null);
      loadData();
    } else {
      alert('Gagal mengupdate stok: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ringkasan</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card flex items-center gap-3 p-4 bg-white border rounded-xl shadow-sm">
          <div className="rounded-lg bg-amber-100 p-2 text-amber-700"><Package size={20} /></div>
          <div>
            <p className="text-xs font-medium text-stone-500">Total barang</p>
            <p className="text-xl font-bold">{stats.totalItems.toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="card flex items-center gap-3 p-4 bg-white border rounded-xl shadow-sm">
          <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700"><ArrowDownRight size={20} /></div>
          <div>
            <p className="text-xs font-medium text-stone-500">Unit masuk</p>
            <p className="text-xl font-bold text-emerald-600">{stats.unitIn.toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="card flex items-center gap-3 p-4 bg-white border rounded-xl shadow-sm">
          <div className="rounded-lg bg-rose-100 p-2 text-rose-700"><ArrowUpRight size={20} /></div>
          <div>
            <p className="text-xs font-medium text-stone-500">Unit keluar</p>
            <p className="text-xl font-bold text-rose-600">{stats.unitOut.toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="card flex items-center gap-3 p-4 bg-white border rounded-xl shadow-sm">
          <div className="rounded-lg bg-blue-100 p-2 text-blue-700"><History size={20} /></div>
          <div>
            <p className="text-xs font-medium text-stone-500">Jumlah transaksi</p>
            <p className="text-xl font-bold">{stats.totalTx.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* Tabel Stok Terkini */}
      <div className="card bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-200">
          <h2 className="font-bold text-lg">Stok terkini</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-500 border-b">
              <tr>
                <th className="p-3">Kode</th>
                <th className="p-3">Deskripsi</th>
                <th className="p-3">Kategori</th>
                <th className="p-3 text-right">Stock</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr><td colSpan={5} className="p-4 text-center text-stone-400">Memuat stok barang...</td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50">
                  <td className="p-3 font-medium">{item.sku}</td>
                  <td className="p-3 text-stone-700">{item.name}</td>
                  <td className="p-3 text-stone-500 text-xs uppercase">{item.category || '-'}</td>
                  <td className="p-3 text-right font-bold">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        min="0"
                        className="input w-20 text-right py-1 px-2 text-sm border rounded"
                        value={editSaldo}
                        onChange={(e) => setEditSaldo(e.target.value)}
                      />
                    ) : (
                      <span className={item.currentStock > 0 ? 'text-emerald-700' : 'text-rose-600'}>
                        {item.currentStock}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {editingId === item.id ? (
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleUpdateSaldo(item.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Simpan"><Save size={16} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-stone-400 hover:bg-stone-100 rounded" title="Batal"><X size={16} /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingId(item.id); setEditSaldo(item.currentStock); }} className="p-1 text-stone-400 hover:text-amber-600 rounded" title="Edit Stok Manual">
                        <Edit2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
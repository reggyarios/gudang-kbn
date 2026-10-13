import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabaseClient';

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function range(period) {
  const now = new Date();
  if (period === 'weekly') {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6); // 7 hari termasuk hari ini
    return { from, to: new Date(now.getTime() + 1000), name: `mingguan_${ymd(from)}_sd_${ymd(now)}` };
  }
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    name: `bulanan_${now.getFullYear()}-${pad(now.getMonth() + 1)}`,
  };
}

async function fetchAll({ from, to }) {
  const out = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase
      .from('transactions')
      .select('timestamp, item_code, transaction_type, quantity, notes, items(item_description)')
      .gte('timestamp', from.toISOString())
      .lt('timestamp', to.toISOString())
      .order('timestamp', { ascending: true })
      .range(start, start + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

export async function exportTransactions(period) {
  const r = range(period);
  const data = await fetchAll(r);
  if (!data.length) throw new Error('Tidak ada transaksi pada periode ini.');

  const rows = data.map((t, i) => ({
    No: i + 1,
    'Tanggal & Waktu': new Date(t.timestamp).toLocaleString('id-ID'),
    'Kode Barang': t.item_code,
    'Nama Barang': t.items?.item_description || '',
    'Tipe Transaksi': t.transaction_type === 'IN' ? 'Masuk' : 'Keluar',
    Jumlah: t.quantity,
    Keterangan: t.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 16 }, { wch: 36 }, { wch: 16 }, { wch: 10 }, { wch: 36 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, period === 'weekly' ? 'Mingguan' : 'Bulanan');
  XLSX.writeFile(wb, `laporan-transaksi-${r.name}.xlsx`);
  return rows.length;
}

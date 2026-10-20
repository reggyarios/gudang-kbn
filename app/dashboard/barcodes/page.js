'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import JsBarcode from 'jsbarcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Download, Barcode as BarcodeIcon } from 'lucide-react';

export default function BarcodeGeneratorPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('sku, name')
      .order('sku');
    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();

    // Setup Realtime Subscription agar otomatis update jika ada barang baru ditambahkan
    const channel = supabase.channel('items-barcode-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        fetchItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems]);

  const downloadAllBarcodesAsZip = async () => {
    if (items.length === 0) return;
    setDownloading(true);

    const zip = new JSZip();
    const folder = zip.folder("barcode-stiker-gudang");

    items.forEach((item) => {
      const canvas = document.createElement('canvas');
      try {
        JsBarcode(canvas, item.sku, {
          format: "CODE128",
          width: 2,
          height: 90,
          displayValue: true,
          fontSize: 14,
          margin: 10
        });

        const base64Data = canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
        const safeSku = item.sku.replace(/[/\\?%*:|"<>]/g, '-');
        folder.file(`${safeSku}.png`, base64Data, { base64: true });
      } catch (e) {
        console.error(`Gagal generate barcode untuk SKU: ${item.sku}`, e);
      }
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "barcode-barang-gudang.zip");
    setDownloading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarcodeIcon className="text-amber-600" /> Cetak & Generator Barcode
          </h1>
          <p className="text-sm text-stone-500">
            Unduh seluruh barcode barang dalam format ZIP untuk dicetak menjadi stiker label fisik gudang.
          </p>
        </div>
        <button 
          onClick={downloadAllBarcodesAsZip} 
          disabled={downloading || items.length === 0}
          className="btn flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition"
        >
          <Download size={18} />
          {downloading ? 'Membuat ZIP Berisi Barcode...' : 'Download Semua Barcode (ZIP)'}
        </button>
      </div>

      {loading ? (
        <p className="text-stone-500 py-6 text-center">Memuat data barang dari database...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item, idx) => (
            <div key={idx} className="card p-4 flex flex-col items-center justify-between bg-white border border-stone-200 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="w-full text-left mb-2">
                <span className="text-xs font-bold text-stone-400 block truncate" title={item.name}>
                  {item.name}
                </span>
              </div>
              
              <div className="py-2 flex justify-center w-full bg-stone-50 rounded-lg border border-stone-100 my-1">
                <BarcodePreview sku={item.sku} />
              </div>

              <div className="w-full text-center mt-2">
                <span className="text-xs font-mono font-semibold text-stone-700 bg-stone-100 px-2 py-1 rounded">
                  SKU: {item.sku}
                </span>
              </div>
            </div>
          ))}
          {!items.length && (
            <div className="col-span-full py-10 text-center text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200">
              Belum ada data barang di database untuk digenerate barcodenya.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BarcodePreview({ sku }) {
  useEffect(() => {
    try {
      JsBarcode(`#barcode-${sku}`, sku, {
        format: "CODE128",
        width: 1.5,
        height: 50,
        displayValue: true,
        fontSize: 12,
        margin: 5
      });
    } catch (e) {
      console.error(e);
    }
  }, [sku]);

  return <canvas id={`barcode-${sku}`} className="max-h-[70px] object-contain" />;
}
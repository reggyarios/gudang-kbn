'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Warehouse } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error') === 'forbidden')
      setError('Akun ini tidak punya akses admin.');
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setBusy(false); return setError('Email atau kata sandi salah.'); }
    const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
    if (p?.role !== 'admin') {
      await supabase.auth.signOut();
      setBusy(false);
      return setError('Akun ini tidak punya akses admin.');
    }
    router.replace('/dashboard');
  };

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-ink text-amber-500"><Warehouse size={20} /></span>
          <div>
            <h1 className="text-lg font-bold leading-tight">Gudang KBN</h1>
            <p className="text-sm text-stone-500">Masuk untuk mengelola stok</p>
          </div>
        </div>
        {error && <p className="alert">{error}</p>}
        <label className="block text-sm font-medium">Email
          <input className="input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">Kata sandi
          <input className="input mt-1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn w-full" disabled={busy}>{busy ? 'Memproses...' : 'Masuk'}</button>
      </form>
    </main>
  );
}

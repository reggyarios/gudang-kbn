'use client';
import { useEffect, useState, useCallback } from 'react';
import { UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { roleLabel } from '@/lib/roles';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (err) setError(err.message); else setUsers(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setInfo('');
    const { data: { session } } = await supabase.auth.getSession();
    // Role sengaja tidak dikirim: server selalu membuat akun pekerja.
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error || 'Gagal membuat akun.');
    setInfo(`Akun pekerja ${json.email} berhasil dibuat.`);
    setForm({ email: '', password: '' });
    load();
  };

  return (
    <>
      <h1 className="text-2xl font-bold">Pengguna</h1>
      {error && <p className="alert">{error}</p>}
      {info && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</p>}

      <form onSubmit={submit} className="card grid gap-3 p-4 sm:grid-cols-5">
        <div className="sm:col-span-5">
          <h2 className="font-semibold">Tambah akun pekerja</h2>
          <p className="text-sm text-stone-500">Akun baru otomatis berperan sebagai pekerja pencatat barang. Akun admin tidak bisa dibuat dari sini.</p>
        </div>
        <input className="input sm:col-span-2" type="email" required placeholder="Email pekerja" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input sm:col-span-2" type="password" required minLength={8} placeholder="Kata sandi (min. 8 karakter)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn" disabled={busy}><UserPlus size={16} /> {busy ? 'Membuat...' : 'Tambah'}</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-stone-200"><tr><th className="th">Email</th><th className="th">Terdaftar</th><th className="th">Peran</th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="td font-medium">{u.email}</td>
                <td className="td">{new Date(u.created_at).toLocaleDateString('id-ID')}</td>
                <td className="td"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-700'}`}>{roleLabel(u.role)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

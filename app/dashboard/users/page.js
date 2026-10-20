'use client';
import { useEffect, useState, useCallback } from 'react';
import { UserPlus, Trash2, Shield, User, Edit3, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function UsersManagementPage() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState('pekerja');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (!error) setUsers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // CREATE Pekerja
  const handleAddWorker = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setInfo('');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'pekerja' } }
    });

    if (signUpError) {
      setBusy(false);
      return setError(signUpError.message);
    }

    if (data?.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: email,
        role: 'pekerja'
      });
      setInfo(`Pekerja baru (${email}) berhasil ditambahkan.`);
      setEmail(''); setPassword('');
      loadUsers();
    }
    setBusy(false);
  };

  // UPDATE Role Pengguna
  const handleUpdateRole = async (userId) => {
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ role: editRole }).eq('id', userId);
    if (!error) {
      setEditingId(null);
      setInfo('Peran pengguna berhasil diperbarui.');
      loadUsers();
    } else {
      setError(error.message);
    }
    setBusy(false);
  };

  // DELETE Pengguna
  const handleDeleteUser = async (userId, userEmail) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus pengguna ${userEmail}?`)) return;
    
    setBusy(true);
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (!error) {
      setInfo(`Pengguna ${userEmail} berhasil dihapus.`);
      loadUsers();
    } else {
      setError(error.message);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pengguna</h1>

      {error && <p className="alert bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-sm">{error}</p>}
      {info && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{info}</p>}

      {/* CREATE FORM */}
      <div className="card p-5 bg-white border rounded-xl shadow-sm space-y-3">
        <h2 className="font-bold text-md">Tambah akun pekerja</h2>
        <p className="text-xs text-stone-500">Akun baru otomatis berperan sebagai pekerja pencatat barang.</p>
        <form onSubmit={handleAddWorker} className="flex flex-wrap gap-3">
          <input
            type="email"
            required
            placeholder="Email pekerja"
            className="input flex-1 min-w-[200px] border p-2 rounded-lg text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Kata sandi (min. 8 karakter)"
            className="input flex-1 min-w-[200px] border p-2 rounded-lg text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button disabled={busy} className="btn bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <UserPlus size={16} /> Tambah
          </button>
        </form>
      </div>

      {/* READ / UPDATE / DELETE TABLE */}
      <div className="card bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500 border-b">
            <tr>
              <th className="p-3">Email</th>
              <th className="p-3">Terdaftar</th>
              <th className="p-3">Peran</th>
              <th className="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {loading ? (
              <tr><td colSpan={4} className="p-4 text-center text-stone-400">Memuat daftar pengguna...</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-stone-50">
                <td className="p-3 font-medium">{u.email}</td>
                <td className="p-3 text-stone-500 text-xs">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-'}
                </td>
                <td className="p-3">
                  {editingId === u.id ? (
                    <select
                      className="border rounded p-1 text-xs"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                    >
                      <option value="pekerja">Pekerja</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-700'
                    }`}>
                      {u.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                      {u.role === 'admin' ? 'Admin' : 'Pekerja'}
                    </span>
                  )}
                </td>
                <td className="p-3 text-center">
                  {editingId === u.id ? (
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleUpdateRole(u.id)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Check size={16} /></button>
                      <button onClick={() => setEditingId(null)} className="text-stone-400 hover:bg-stone-100 p-1 rounded"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditingId(u.id); setEditRole(u.role || 'pekerja'); }} className="text-stone-400 hover:text-amber-600 p-1 rounded" title="Edit Peran">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDeleteUser(u.id, u.email)} className="text-stone-400 hover:text-rose-600 p-1 rounded" title="Hapus Pengguna">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { WORKER_ROLE } from '@/lib/roles';

export const runtime = 'nodejs';

const fail = (error, status) => NextResponse.json({ error }, { status });

export async function POST(req) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return fail('SUPABASE_SERVICE_ROLE_KEY belum diatur di server.', 500);

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // 1. Pastikan pemanggil adalah admin yang login
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return fail('Belum login.', 401);
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return fail('Sesi tidak valid.', 401);
  const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (caller?.role !== 'admin') return fail('Hanya admin yang boleh menambah pengguna.', 403);

  // 2. Validasi input
  const body = await req.json().catch(() => ({}));
  if (body.role !== undefined && body.role !== WORKER_ROLE && body.role !== 'worker')
    return fail('Admin hanya boleh membuat akun pekerja.', 403);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Format email tidak valid.', 400);
  if (password.length < 8) return fail('Kata sandi minimal 8 karakter.', 400);

  // 3. Buat akun; role SELALU dipaksa ke pekerja di server
  const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createErr) return fail(createErr.message, 400);

  const { error: profErr } = await admin.from('profiles').upsert({ id: created.user.id, email, role: WORKER_ROLE });
  if (profErr) {
    await admin.auth.admin.deleteUser(created.user.id); // rollback
    return fail(profErr.message, 500);
  }
  return NextResponse.json({ id: created.user.id, email, role: WORKER_ROLE }, { status: 201 });
}

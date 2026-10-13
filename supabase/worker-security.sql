-- Jalankan di Supabase > SQL Editor (setelah setup.sql).
-- Lapisan pertahanan terakhir di database: lewat aplikasi/klien, akun admin TIDAK bisa dibuat
-- dan role TIDAK bisa diubah. SQL Editor dan service role (auth.role() null / 'service_role')
-- tetap bisa, jadi Anda sebagai pemilik proyek masih dapat menetapkan admin secara manual.

create or replace function public.guard_profile_role() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' and new.role is distinct from 'user' then
      raise exception 'Akun admin tidak boleh dibuat lewat aplikasi.';
    end if;
    if tg_op = 'UPDATE' and new.role is distinct from old.role then
      raise exception 'Role tidak boleh diubah lewat aplikasi.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_profile_role on public.profiles;
create trigger trg_guard_profile_role before insert or update on public.profiles
for each row execute function public.guard_profile_role();

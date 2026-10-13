-- Jalankan di Supabase > SQL Editor.

-- 1. Helper cek admin (security definer agar tidak rekursif di RLS)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 2. RLS
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_select" on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "profiles_update_admin" on public.profiles for update using (public.is_admin());

drop policy if exists "items_admin_all" on public.items;
create policy "items_admin_all" on public.items for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tx_admin_all" on public.transactions;
create policy "tx_admin_all" on public.transactions for all using (public.is_admin()) with check (public.is_admin());

-- 3. Saldo barang otomatis berubah saat transaksi dicatat
create or replace function public.apply_transaction() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.items
     set current_balance = current_balance + case when new.transaction_type = 'IN' then new.quantity else -new.quantity end
   where item_code = new.item_code;
  return new;
end $$;

drop trigger if exists trg_apply_transaction on public.transactions;
create trigger trg_apply_transaction after insert on public.transactions
for each row execute function public.apply_transaction();

-- 4. Realtime untuk tabel transaksi
alter publication supabase_realtime add table public.transactions;

-- 5. Jadikan akun pertama sebagai admin (ganti emailnya)
-- update public.profiles set role = 'admin' where email = 'email-anda@contoh.com';

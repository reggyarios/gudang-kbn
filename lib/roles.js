// Nilai role pekerja/staff di kolom profiles.role.
// Skema awal Anda memakai 'admin' dan 'user'. Jika di database Anda memakai 'worker', ganti di sini
// dan di supabase/worker-security.sql.
export const WORKER_ROLE = 'user';
export const roleLabel = (r) => (r === 'admin' ? 'Admin' : 'Pekerja');

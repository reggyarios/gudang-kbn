# Gudang KBN
1. `npm install` lalu `npm run dev`
2. Supabase SQL Editor: jalankan `supabase/setup.sql`, lalu `supabase/worker-security.sql`.
3. Isi `SUPABASE_SERVICE_ROLE_KEY` di `.env.local` (khusus server, jangan di-commit).
4. Deploy ke Vercel dengan 3 Environment Variables:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

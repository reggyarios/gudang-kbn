import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wtjivuguzvlnmsvrlns.supabase.co';
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_598o-aPDyYIwLydRTatLOQ_OM7lPkYM';

export const supabase = createClient(url, key);

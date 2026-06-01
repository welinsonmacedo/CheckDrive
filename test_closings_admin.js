import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY // fallback
);

async function check() {
  const { data, error } = await supabaseAdmin.from('score_closings').select('*');
  console.log('closings admin:', data, error);
}
check();

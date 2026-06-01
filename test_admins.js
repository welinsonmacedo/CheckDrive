import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('role', 'admin');
  console.log('admins:', data.map(d => ({id: d.id, email: d.email, role: d.role})));
}
check();

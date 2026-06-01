import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const adminId = '58967348-161c-4da6-ad49-bd8f5b63c490';
  
  const { data: closing, error } = await supabaseAdmin
        .from('score_closings')
        .insert({
          period_start: '2026-05-01',
          period_end: '2026-06-01',
          closed_by: adminId
        })
        .select()
        .single();
        
   console.log('insertion:', closing, error);
}
check();

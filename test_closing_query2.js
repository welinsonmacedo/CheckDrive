import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
      const { data, error } = await supabase
        .from('score_closings')
        .select(`
          *,
          closed_by ( full_name ),
          score_closing_items ( id, driver_id, score, total_checklists, profiles (full_name) )
        `)
        .order('closed_at', { ascending: false });
        
      console.log('fetch closes with closed_at:', data, error);
}
check();

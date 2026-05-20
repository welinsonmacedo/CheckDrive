import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function alter() {
  const { data, error } = await supabase.rpc('exec_sql', { 
     sql: `ALTER TABLE routes ADD COLUMN IF NOT EXISTS modality_ids UUID[] DEFAULT '{}';` 
  });
  console.log("Error:", error);
}

alter();

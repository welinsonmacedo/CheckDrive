import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const email = 'admin@checkdrive.com'; // Wait, without service key or auth I can't insert.
}
run();

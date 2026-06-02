import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('checklist_items').select('id, title, is_trailer_item');
  const counts = {};
  data.forEach(d => {
    counts[d.title] = (counts[d.title] || 0) + 1;
  });
  console.log('Duplicate titles:', Object.entries(counts).filter(([_, c]) => c > 1));
}
run();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data } = await supabase.from('checklist_items').select('id, title, input_type').eq('input_type', 'fuel_liters');
  console.log("Fuel items:", JSON.stringify(data, null, 2));

  const { data: subs } = await supabase.from('checklist_submissions').select('id, type, details, created_at, odometer, vehicles(plate)').order('created_at', { ascending: false }).limit(20);
  console.log("Subs:", JSON.stringify(subs, null, 2));
}

run();

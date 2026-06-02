import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('schedules').select('id, vehicle_id, start_at, start_checklist_id(id, odometer), end_checklist_id(id, odometer), fuel_checklist_id(id, details)').order('start_at', {ascending: false}).limit(5);
  console.log(JSON.stringify(data, null, 2));
}
run();

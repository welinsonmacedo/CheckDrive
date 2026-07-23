import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
const env = dotenv.parse(fs.readFileSync('.env.example'));
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mwawvcdjwhowigrtpmlj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const userCompanyId = '85295d94-ea18-42c1-9db2-fed0ebdc4472'; // using one from previous
  const { data, error } = await supabase.from('schedules').select('id, start_at, end_at, driver_id, vehicle_id').limit(10).order('created_at', { ascending: false });
  console.log("Recent schedules:", data);
}
test();

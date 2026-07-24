import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
const env = dotenv.parse(fs.readFileSync('.env.example'));
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mwawvcdjwhowigrtpmlj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const filterDate = '2026-07-23';
  const localStart = new Date(`${filterDate}T00:00:00`);
  const localEnd = new Date(`${filterDate}T23:59:59.999`);
  console.log("localStart ISO", localStart.toISOString());
  console.log("localEnd ISO", localEnd.toISOString());

  const { data, error } = await supabase.from('schedules').select('id, start_at, end_at')
    .lte("start_at", localEnd.toISOString())
    .gte("end_at", localStart.toISOString());
  
  console.log("Returned count:", data?.length, "error:", error);
}
test();

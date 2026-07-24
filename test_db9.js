import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
const env = dotenv.parse(fs.readFileSync('.env.example'));
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mwawvcdjwhowigrtpmlj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: v } = await supabase.from('vehicles').select('*').limit(1);
  console.log("vehicles:", v ? Object.keys(v[0] || {}) : []);
  const { data: t } = await supabase.from('trailers').select('*').limit(1);
  console.log("trailers:", t ? Object.keys(t[0] || {}) : []);
}
test();

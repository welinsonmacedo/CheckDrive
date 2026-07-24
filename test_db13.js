import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
const env = dotenv.parse(fs.readFileSync('.env.example'));
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mwawvcdjwhowigrtpmlj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: v } = await supabase.from('vehicles').select('id, chassi').limit(1);
  if (!v || v.length === 0) return console.log("No vehicle");
  
  const id = v[0].id;
  const oldChassi = v[0].chassi;
  console.log("Old chassi:", oldChassi);

  const { error } = await supabase.from('vehicles').update({ chassi: "TESTCHASSI" }).eq('id', id);
  console.log("Update error:", error);

  const { data: v2 } = await supabase.from('vehicles').select('id, chassi').eq('id', id);
  console.log("New chassi:", v2[0].chassi);

  // revert
  await supabase.from('vehicles').update({ chassi: oldChassi }).eq('id', id);
}
test();

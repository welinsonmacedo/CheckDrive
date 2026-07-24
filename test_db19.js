import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
const env = dotenv.parse(fs.readFileSync('.env.example'));
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mwawvcdjwhowigrtpmlj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: vRes } = await supabase.from('vehicles').select('id, company_id, chassi').limit(1);
  const company_id = vRes[0].company_id;
  const vehicle_id = vRes[0].id;

  // login
  const { data: { user } } = await supabase.auth.signInWithPassword({
    email: 'test_admin_2026@example.com',
    password: 'password123'
  });
  
  if (!user) return console.log("Login failed");

  // assign to company via RPC? No, I don't have RPC.
  console.log("We need to assign the user to company:", company_id);
}
test();

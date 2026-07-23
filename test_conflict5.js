import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
const env = dotenv.parse(fs.readFileSync('.env.example'));
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mwawvcdjwhowigrtpmlj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const driver_id = 'e1139ad9-30b8-4c0b-a2b6-8a725c981fd4';
  const vehicle_id = '5a6b1373-6058-4c63-a96f-8fed835f1c5d';
  const orConditions = [
    `driver_id.eq.${driver_id}`,
    `vehicle_id.eq.${vehicle_id}`
  ];
  
  const start_at = '2026-07-23T18:00:00Z'; // some time later
  const end_at = '2026-07-23T19:00:00Z';
  
  const { data: conflicts, error: conflictError } = await supabase
    .from("schedules")
    .select("id, start_at, end_at, driver_id, vehicle_id")
    .or(orConditions.join(","))
    .lt("start_at", end_at)
    .gt("end_at", start_at);
    
  console.log("Conflicts:", conflicts, conflictError);
}
test();

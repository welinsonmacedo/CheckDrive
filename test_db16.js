import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
const env = dotenv.parse(fs.readFileSync('.env.example'));
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mwawvcdjwhowigrtpmlj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  await supabase.auth.signInWithPassword({
    email: 'WelinsonMarlon15@gmail.com',
    password: 'password123'
  }); // Note: if login fails, RLS blocks update

  const { data: v } = await supabase.from('vehicles').select('*').eq('chassi', '93KP0R1C5NE176570');
  if (!v || v.length === 0) return console.log("No vehicle found");
  
  const vehicle = v[0];
  console.log("Found vehicle:", vehicle.plate, vehicle.chassi);
  
  const payload = {
    plate: vehicle.plate,
    model: vehicle.model,
    type: vehicle.type,
    requires_trailer: vehicle.requires_trailer,
    modality_id: vehicle.modality_id || null,
    renavam: vehicle.renavam || null,
    chassi: vehicle.chassi || null,
    manufacture_year: vehicle.manufacture_year || null,
    model_year: vehicle.model_year || null,
    crv_number: vehicle.crv_number || null,
    fuel_type: vehicle.fuel_type || null,
    color: vehicle.color || null,
    antt: vehicle.antt || null,
    insurance_id: vehicle.insurance_id || null,
    company_id: vehicle.company_id,
  };

  console.log("Payload:", payload);

  const { data, error } = await supabase.from('vehicles').update(payload).eq('id', vehicle.id).select();
  console.log("Update error:", error);
  console.log("Update returned:", data);
}
test();

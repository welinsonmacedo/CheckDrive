import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
const env = dotenv.parse(fs.readFileSync('.env.example'));
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mwawvcdjwhowigrtpmlj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: vRes } = await supabase.from('vehicles').select('*, vehicle_modalities(name)').eq('chassi', '93KP0R1C5NE176570').limit(1);
  const vehicles = vRes || [];
  
  const combinedItems = [
    ...vehicles.map(v => ({ ...v, itemType: 'vehicle' })),
  ];
  const currentItem = combinedItems[0];
  console.log("Current item chassi before edit:", currentItem.chassi);
  
  const itemForm = { ...currentItem, photo_front_url: currentItem.photo_front_url || "", doc_crlv_url: currentItem.doc_crlv_url || "" };
  
  const payload = {
    plate: itemForm.plate, model: itemForm.model, type: itemForm.type, requires_trailer: itemForm.requires_trailer,
    modality_id: itemForm.modality_id || null, renavam: itemForm.renavam || null, chassi: itemForm.chassi || null, manufacture_year: itemForm.manufacture_year || null,
    model_year: itemForm.model_year || null, crv_number: itemForm.crv_number || null, fuel_type: itemForm.fuel_type || null,
    color: itemForm.color || null, antt: itemForm.antt || null, insurance_id: itemForm.insurance_id || null,
    company_id: itemForm.company_id,
  };
  
  console.log("Payload chassi:", payload.chassi);
}
test();

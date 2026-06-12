import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testSubmit() {
  const { data: { user: authUser, session }, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'WelinsonMarlon15@gmail.com',
    password: 'Mudar@123' 
  });
  console.log(authErr);
  console.log(authUser?.id);
  const { data: user } = await supabase.from('profiles').select('id, company_id').eq('id', authUser?.id).single();
  const driver_id = user.id;
  const company_id = user.company_id;

  const { data: vehicle } = await supabase.from('vehicles').select('id').eq('company_id', company_id).limit(1).single();

  const { data, error } = await supabase.from('checklist_submissions').insert({
    driver_id,
    vehicle_id: vehicle?.id || null,
    type: 'start',
    odometer: 1000,
    company_id
  }).select();

  console.log("Error:", error);
  console.log("Data:", data);
}

testSubmit();

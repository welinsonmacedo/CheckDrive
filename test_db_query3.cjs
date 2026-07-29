require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from("auto_alerts").select('*, vehicles(plate, model), profiles(full_name)').limit(1);
  console.log("Query error:", error);
  console.log("Data:", data);
}
run();

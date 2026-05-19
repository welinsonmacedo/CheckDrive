import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: drivers, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, participates_in_ranking, score_profiles(name), driver_performance(score, total_checklists)')
    .eq('role', 'driver');

  console.log("Error:", error);
  if (drivers && drivers.length > 0) {
    console.log("First driver performance:", drivers[0].driver_performance);
  }
}

test();

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('traffic_infractions').select('*').limit(1);
  if (error && error.message.includes("RLS")) {
     // Even if RLS fails, we can check the columns by using the REST API to get openapi.json
     const res = await fetch(process.env.VITE_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.VITE_SUPABASE_ANON_KEY);
     const json = await res.json();
     console.log("Cols:", Object.keys(json.definitions.traffic_infractions?.properties || {}));
  }
}
run();

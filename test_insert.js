import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const payload = {
     company_id: "7db06e92-d6fc-4f6c-827d-9dc4621c1f24",
     driver_id: "96ab2931-e40f-48d0-ad1f-cdcd57297926",
     infraction_code: "123",
     infraction_date: new Date().toISOString(),
     description: "test",
     amount: 1,
     discounted_amount: 1,
     installments: [],
     license_plate: "ABC-1234"
  };
  const { data, error } = await supabase.from('traffic_infractions').insert([payload]);
  console.log("Insert result:", error || "success");
}
run();

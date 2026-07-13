const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

async function check() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const tables = ['vehicles', 'trailers', 'vehicle_types', 'vehicle_models', 'vehicle_modalities', 'profiles', 'checklist_submissions', 'checklist_issues', 'routes', 'schedules', 'traffic_infractions', 'score_closings', 'baits', 'inventory_items', 'inventory_suppliers', 'inventory_transactions', 'manual_penalties', 'integration_whatsapp_rules'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('company_id').limit(1);
    if (error) {
      console.log("NO_COMPANY_ID: " + table);
    } else {
      console.log("HAS_COMPANY_ID: " + table);
    }
  }
}
check();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function check() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const tables = ['checklist_types', 'checklist_items', 'app_settings', 'audit_logs', 'score_profiles', 'vehicle_averages', 'schedules', 'companies'];
  
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

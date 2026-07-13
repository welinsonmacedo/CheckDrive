const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function check() {
  // Try reading env vars
  const envFile = fs.readFileSync('.env.example', 'utf8') + '\n' + (fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '');
  const urlMatch = envFile.match(/VITE_SUPABASE_URL=([^\n]+)/);
  const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY=([^\n]+)/);
  
  if (!urlMatch || !keyMatch) {
    console.log("No env"); return;
  }
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  
  const tables = ['vehicles', 'trailers', 'vehicle_types', 'vehicle_models', 'vehicle_modalities', 'drivers', 'profiles', 'checklist_submissions', 'checklist_issues', 'routes', 'schedules', 'traffic_infractions', 'score_closings', 'baits', 'inventory_items', 'inventory_suppliers', 'inventory_transactions', 'manual_penalties', 'integration_whatsapp_rules'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('company_id').limit(1);
      if (error) {
        // column doesn't exist
        console.log(\`Table \${table} does not have company_id\`);
      } else {
        console.log(\`Table \${table} has company_id\`);
      }
    } catch (e) {}
  }
}
check();

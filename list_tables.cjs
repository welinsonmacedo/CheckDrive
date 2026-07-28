require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const tables = ['checklist_submissions', 'checklist_issues', 'auto_alerts', 'preventive_maintenance_alerts', 'vehicles', 'profiles'];
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`${table}: ${count} rows`, error ? error.message : '');
  }
}
run();

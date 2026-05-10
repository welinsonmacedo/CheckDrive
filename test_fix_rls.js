const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const query = `
    ALTER TABLE manual_penalties ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Enable read access for all users" ON manual_penalties;
    DROP POLICY IF EXISTS "Enable all access for all users" ON manual_penalties;
    CREATE POLICY "Enable all access for all users" ON manual_penalties FOR ALL USING (true) WITH CHECK (true);
  `;
  const { error } = await supabase.rpc('exec_sql', { sql: query });
  console.log(error);
}
run();

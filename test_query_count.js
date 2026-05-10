const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const query = `
    ALTER TABLE checklist_issues ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 1;
    ALTER TABLE checklist_issues ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
  `;
  const { error } = await supabase.rpc('exec_sql', { sql: query });
  console.log(error);
}
run();

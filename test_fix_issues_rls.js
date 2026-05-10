const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const query = `
    DROP POLICY IF EXISTS "Drivers can see own related issues" ON public.checklist_issues;
    DROP POLICY IF EXISTS "Drivers can insert own related issues" ON public.checklist_issues;
    DROP POLICY IF EXISTS "Public Read for Issues" ON public.checklist_issues;
    DROP POLICY IF EXISTS "Drivers can insert issues" ON public.checklist_issues;
    DROP POLICY IF EXISTS "Drivers can update issues" ON public.checklist_issues;

    CREATE POLICY "Public Read for Issues" ON public.checklist_issues FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Drivers can insert issues" ON public.checklist_issues FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "Drivers can update issues" ON public.checklist_issues FOR UPDATE TO authenticated USING (true);
  `;
  const { error } = await supabase.rpc('exec_sql', { sql: query });
  console.log(error);
}
run();

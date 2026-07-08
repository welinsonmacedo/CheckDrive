import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);
async function run() {
  const sql = `
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('checklist-photos', 'checklist-photos', true) 
    ON CONFLICT (id) DO UPDATE SET public = true;

    DROP POLICY IF EXISTS "Allow authenticated users to upload checklist photos" ON storage.objects;
    CREATE POLICY "Allow authenticated users to upload checklist photos" 
    ON storage.objects FOR INSERT TO authenticated 
    WITH CHECK (bucket_id = 'checklist-photos');

    DROP POLICY IF EXISTS "Public Read on checklist photos" ON storage.objects;
    CREATE POLICY "Public Read on checklist photos" 
    ON storage.objects FOR SELECT TO authenticated 
    USING (bucket_id = 'checklist-photos');
  `;
  const { data, error } = await supabase.rpc("exec_sql", { sql });
  if (error) {
    console.error("Error executing SQL:", error);
  } else {
    console.log("SQL executed successfully:", data);
  }
}
run();

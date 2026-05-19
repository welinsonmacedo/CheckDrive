import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const query = `
    CREATE TABLE IF NOT EXISTS vehicle_modalities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    ALTER TABLE vehicle_modalities ENABLE ROW LEVEL SECURITY;
    
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE tablename = 'vehicle_modalities' AND policyname = 'Public Read'
        ) THEN
            CREATE POLICY "Public Read" ON vehicle_modalities FOR SELECT TO authenticated USING (true);
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE tablename = 'vehicle_modalities' AND policyname = 'Admin Manage'
        ) THEN
            CREATE POLICY "Admin Manage" ON vehicle_modalities FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
                )
            );
        END IF;
    END
    $$;

    ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS modality_id UUID REFERENCES vehicle_modalities(id);
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS modality_ids UUID[] DEFAULT '{}';
  `;
  const { error } = await supabase.rpc('exec_sql', { sql: query });
  console.log("Result:", error);
}
run();

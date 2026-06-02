import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { error: e1 } = await supabase.rpc('execute_sql', {
    sql_string: `
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      
      CREATE OR REPLACE FUNCTION admin_change_user_password(target_email TEXT, new_password TEXT)
      RETURNS void AS $$
      DECLARE
        target_uid UUID;
      BEGIN
        IF NOT is_admin() THEN
          RAISE EXCEPTION 'Acesso negado';
        END IF;

        SELECT id INTO target_uid FROM auth.users WHERE email = target_email;
        IF target_uid IS NULL THEN
          RAISE EXCEPTION 'User not found';
        END IF;

        UPDATE auth.users 
        SET encrypted_password = crypt(new_password, gen_salt('bf'))
        WHERE id = target_uid;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
    `
  });
  console.log("execute_sql:", e1);
  const { error: e2 } = await supabase.rpc('run_sql', {
    query: `
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      
      CREATE OR REPLACE FUNCTION admin_change_user_password(target_email TEXT, new_password TEXT)
      RETURNS void AS $$
      DECLARE
        target_uid UUID;
      BEGIN
        IF NOT is_admin() THEN
          RAISE EXCEPTION 'Acesso negado';
        END IF;

        SELECT id INTO target_uid FROM auth.users WHERE email = target_email;
        IF target_uid IS NULL THEN
          RAISE EXCEPTION 'User not found';
        END IF;

        UPDATE auth.users 
        SET encrypted_password = crypt(new_password, gen_salt('bf'))
        WHERE id = target_uid;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
    `
  });
  console.log("run_sql:", e2);
}
run();

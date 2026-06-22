import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function addRpc() {
  const { data, error } = await supabaseAdmin.rpc('exec_sql', {
    sql: `
    CREATE OR REPLACE FUNCTION public.get_email_by_cpf(p_cpf text)
    RETURNS text AS $$
    DECLARE
        v_email text;
    BEGIN
        SELECT email INTO v_email FROM public.profiles WHERE cpf = p_cpf AND active = true LIMIT 1;
        RETURN v_email;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
    `
  });
  console.log("RPC creation:", error ? error.message : "Success");
}
addRpc();

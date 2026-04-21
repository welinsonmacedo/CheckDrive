import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    // Authenticate with a fake JWT or something? We can just do a query that might fail. 
    // Even if it returns 401/403 (unauthorized due to RLS), if the query syntax is invalid it will return 400!
    const { data, error } = await supabase
    .from('checklist_issues')
    .select(`
      *,
      checklist_submissions!inner (
        id,
        type
      )
    `)
    .neq('checklist_submissions.type', 'fuel');

    console.log("Error:", error);
}

test();

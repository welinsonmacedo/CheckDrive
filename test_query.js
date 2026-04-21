import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase
    .from('checklist_issues')
    .select(`
      *,
      checklist_submissions!inner (
        id,
        type
      )
    `)
    .neq('checklist_submissions.type', 'fuel')
    .order('status', { ascending: false })
    .order('created_at', { ascending: false });

    console.log("Error:", error);
    console.log("Data length:", data?.length);
}

test();

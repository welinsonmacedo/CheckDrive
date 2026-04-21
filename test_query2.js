import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: issues } = await supabase.from('checklist_issues').select('*');
    console.log("Total issues:", issues?.length);

    if (issues && issues.length > 0) {
        console.log("Sample issue ID:", issues[0].id);
        const { data: joinData, error } = await supabase
        .from('checklist_issues')
        .select('*, checklist_submissions(id, type)');
        console.log("Join without inner:", joinData?.[0]?.checklist_submissions?.type, "Error:", error);
    }
}

test();

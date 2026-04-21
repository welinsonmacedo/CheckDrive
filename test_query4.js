import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: d } = await supabase.from('profiles').select('*').eq('role', 'driver').eq('active', true);
    console.log("Profiles eq active=true length", d?.length);
    
    const { data: d2 } = await supabase.from('profiles').select('*').eq('role', 'driver');
    console.log("Profiles without active filter length", d2?.length);
}

test();

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'YOUR_URL';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_KEY';

async function run() {
    console.log("We are inside run()");
}
run();

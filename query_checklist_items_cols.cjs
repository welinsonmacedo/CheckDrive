const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function run() {
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/checklist_items?select=*&limit=1`, {
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
    }
  });
  const json = await res.json();
  if(json.length > 0) {
    console.log(Object.keys(json[0]));
  }
}
run();

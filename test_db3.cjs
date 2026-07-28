require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: submissions } = await supabase.from('checklist_submissions').select('*').neq('type', 'fuel').neq('type', 'Abastecimento').order('created_at', { ascending: false }).limit(10);
  console.log("Submissions count:", submissions?.length);
  if (submissions && submissions.length > 0) {
     const hasDefects = submissions.filter(s => {
       try {
         const parsed = typeof s.responses === 'string' ? JSON.parse(s.responses) : s.responses;
         return parsed && parsed.defects && Object.keys(parsed.defects).length > 0;
       } catch(e) { return false; }
     });
     console.log("Submissions with defects:", hasDefects.length);
  }
}
run();

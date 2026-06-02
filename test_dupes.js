import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: issues } = await supabase.from('checklist_issues').select('*').eq('status', 'pending');
  console.log('Total pending issues:', issues?.length);
  
  if (issues && issues.length > 0) {
    const grouped = {};
    issues.forEach(i => {
      const key = `${i.vehicle_id || 'null'}-${i.trailer_id || 'null'}-${i.item_title}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(i);
    });
    
    let deletedCount = 0;
    for (const key in grouped) {
      const group = grouped[key];
      if (group.length > 1) {
         console.log(`Duplicate found for ${key}: ${group.length} issues`);
         // Keep the most recent one or the one with max report_count
      }
    }
  }
}
run();

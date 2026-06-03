import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: allItems } = await supabase.from('checklist_items').select('id, title');
  const itemTitleMap = {};
  if (allItems) {
    allItems.forEach((i) => {
      itemTitleMap[i.id] = i.title.split('::options=')[0];
    });
  }

  const { data: checklists } = await supabase.from('checklist_submissions').select('details').not('details', 'is', null);
  
  const unknownIds = new Set();
  if (checklists) {
    checklists.forEach(c => {
      if (c.details && c.details.itemValues) {
        Object.entries(c.details.itemValues).forEach(([k, v]) => {
          if ((v === 'defect' || v === 'defeito') && !itemTitleMap[k]) {
            unknownIds.add(k);
          }
        });
      }
    });
  }
  console.log('Unknown IDs/Titles:', Array.from(unknownIds));
}
run();

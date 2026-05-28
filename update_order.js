import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const { error } = await supabase.from('checklist_items').update({ order_index: 1 }).eq('order_index', 0);
  console.log("Update to 1 (required):", error);
}
run();

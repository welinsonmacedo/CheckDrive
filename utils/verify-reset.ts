import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envSrc = fs.readFileSync('.env', 'utf-8');
const env = envSrc.split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if (k && v) acc[k.trim()] = v.trim();
  return acc;
}, {} as any);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: settings } = await supabase.from('app_settings').select('*').single();
  console.log('Settings:', settings);
  
  const { data: scores } = await supabase.from('driver_performance').select('*').limit(3);
  console.log('Scores:', scores);
}
run();

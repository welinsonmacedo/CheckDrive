import { createClient } from "@supabase/supabase-js";
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length === 2) {
        env[parts[0].trim()] = parts[1].trim().replace(/"/g, '');
    }
});

const supabaseAdmin = createClient(
  env.VITE_SUPABASE_URL || "",
  env.VITE_SUPABASE_ANON_KEY || "" // Wait, anon key cannot alter tables. The user should run it in Supabase SQL editor.
);

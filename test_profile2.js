import { createClient } from '@supabase/supabase-js';

// read the .env from process.env if available, or just mock it.
// Actually wait! We can just fetch the profiles via the API if it's public.

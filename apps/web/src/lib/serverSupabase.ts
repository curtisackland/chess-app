import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Use service key if available for admin tasks, otherwise anon key (RLS applies)
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

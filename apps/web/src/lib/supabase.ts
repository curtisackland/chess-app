import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    // Only throw in browser if missing, to prevent runtime crash during build if envs are missing
    if (typeof window !== 'undefined') {
        console.error('Missing Supabase Environment Variables');
    }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

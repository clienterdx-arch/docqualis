import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Criamos o cliente que será usado em todo o sistema
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

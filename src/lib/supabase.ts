// src/lib/supabase.ts

import { createClient } from "@supabase/supabase-js";

/* =========================================================
   🔐 ENVIRONMENT VARIABLES
========================================================= */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL não definido");
}

if (!supabaseAnonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY não definido");
}

/* =========================================================
   🌐 CLIENT (USE CLIENT SAFE)
========================================================= */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
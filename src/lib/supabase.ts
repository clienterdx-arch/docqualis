// src/lib/supabase.ts

import { createClient } from "@supabase/supabase-js";

/* =========================================================
   🔐 ENVIRONMENT VARIABLES
========================================================= */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl) {
  throw new Error("❌ NEXT_PUBLIC_SUPABASE_URL não definido");
}

if (!supabaseAnonKey) {
  throw new Error("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY não definido");
}

/* =========================================================
   🌐 CLIENT SIDE (USE CLIENT)
========================================================= */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
// src/lib/supabase-server.ts

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/* =========================================================
   🔐 ENVIRONMENT VARIABLES
========================================================= */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl) {
  throw new Error("❌ NEXT_PUBLIC_SUPABASE_URL não definido");
}

if (!supabaseAnonKey) {
  throw new Error("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY não definido");
}

/* =========================================================
   🧠 SERVER SIDE
========================================================= */
export function createSupabaseServer() {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components não permitem setar cookies
        }
      },
    },
  });
}
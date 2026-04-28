// src/lib/supabase.ts

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/* =========================================================
   🔐 ENVIRONMENT VARIABLES (validação segura)
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
   🌐 CLIENT SIDE (React / use client)
========================================================= */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* =========================================================
   🧠 SERVER SIDE (Route Handlers / Server Components)
   ✔ Compatível com Next.js App Router
   ✔ Suporte a RLS via cookies
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
          // ⚠️ Server Components não permitem setar cookies
          // Funciona normalmente em Route Handlers
        }
      },
    },
  });
}
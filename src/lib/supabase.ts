// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ✅ Cliente para uso no FRONTEND (componentes client-side)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ✅ Cliente para uso no BACKEND (route.ts, server components)
// Lê o cookie de sessão — necessário para o RLS funcionar
export async function createSupabaseServer() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Ignorado em Server Components (só funciona em Route Handlers)
        }
      },
    },
  })
}
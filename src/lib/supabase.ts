// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Durante o build (SSR/prerender) se as variáveis não existirem,
// criamos um cliente dummy que não faz requisições reais.
// Isso evita o erro "supabaseUrl is required".
const isBuildTime = typeof window === 'undefined' && (!supabaseUrl || !supabaseAnonKey)

export const supabase = isBuildTime
  ? {
      // Mock básico para evitar erros durante o build
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
        insert: () => ({ select: () => Promise.resolve({ data: null, error: null }) }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      }),
      auth: { getSession: () => Promise.resolve({ data: { session: null }, error: null }) },
    }
  : createClient(supabaseUrl!, supabaseAnonKey!)
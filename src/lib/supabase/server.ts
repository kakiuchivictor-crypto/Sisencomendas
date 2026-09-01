import "server-only"

import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY nao definidas"
  )
}

/**
 * Client Supabase para Server Components/Actions — le e escreve a sessao via
 * cookies do Next.js. Em Server Components (nao Actions) a escrita de cookie
 * falha silenciosamente (Next nao permite); nesses casos a sessao e sempre
 * renovada antes pelo proxy.ts, entao a leitura aqui ja vem atualizada.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // chamado de dentro de um Server Component (nao Action/Route) —
          // sem permissao para escrever cookies; a sessao ja foi renovada
          // pelo proxy.ts antes da requisicao chegar aqui.
        }
      },
    },
  })
}

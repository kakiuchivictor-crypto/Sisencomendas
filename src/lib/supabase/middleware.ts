import { createServerClient } from "@supabase/ssr"
import type { NextRequest, NextResponse } from "next/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY não definidas"
  )
}

/**
 * Cria o client Supabase usado pelo proxy.ts (middleware). auth.getClaims()
 * (nao getSession()) e usado pelo chamador para renovar a sessao quando
 * preciso e verificar a assinatura do JWT (ver proxy.ts).
 *
 * Padrao oficial do @supabase/ssr para Next.js: quando a sessao e renovada,
 * setAll() grava os cookies novos
 *  1. em request.cookies, o que atualiza o cabecalho "cookie" da requisicao;
 *  2. numa response RECRIADA a partir dessa requisicao atualizada
 *     (criarResposta() le request.headers na hora), para que os Server
 *     Components e as Server Actions desta mesma requisicao ja leiam o token
 *     novo. Antes a response era criada uma unica vez, com uma copia dos
 *     cabecalhos feita ANTES da renovacao: o navegador recebia os cookies
 *     novos, mas a pagina renderizava com o token antigo (ja expirado);
 *  3. na response (Set-Cookie), junto com os cabecalhos anti-cache que a
 *     biblioteca exige (resposta com cookie de sessao nao pode ir para CDN).
 *
 * getResponse() devolve sempre a response mais recente (pode ter sido
 * recriada dentro do setAll).
 */
export function createSupabaseMiddlewareClient(
  request: NextRequest,
  criarResposta: () => NextResponse
) {
  let response = criarResposta()

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = criarResposta()
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value)
        }
      },
    },
  })

  return { supabase, getResponse: () => response }
}

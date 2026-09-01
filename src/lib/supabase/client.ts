import { createBrowserClient } from "@supabase/ssr"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Client Supabase para o navegador — usado so para o canal Realtime
 * (subscription de mudancas no Postgres). Toda leitura/escrita de dados
 * continua passando por Server Actions + withTenantContext; este client
 * nunca faz query direta a tabelas de negocio.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

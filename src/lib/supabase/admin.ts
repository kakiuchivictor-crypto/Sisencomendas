import "server-only"

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Client privilegiado (service_role) — ignora RLS e pode gerenciar usuarios
 * via Admin API (auth.admin.*). Sensivel: so importar de codigo server-side
 * que precisa criar/gerenciar contas (nunca em rotas expostas ao publico
 * sem checagem de permissao antes).
 */
export function createSupabaseAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não definidas"
    )
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

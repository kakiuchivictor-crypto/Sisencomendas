import "server-only"

import { withTenantContext, type TenantClaims } from "@/lib/db"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { usuarioRepository } from "@/repositories/usuario-repository"

/**
 * Le o usuario autenticado direto do Supabase Auth (getUser() valida contra
 * o servidor, ao contrario de getSession() que so decodifica o JWT local) e
 * busca app_role/condominio_id na tabela usuarios. Como isso roda a cada
 * pagina/action, o app_role/condominio_id usados nas checagens de UI e nos
 * `if (claims.app_role !== "admin")` estao sempre atualizados — nunca vem de
 * um JWT que pode ter ficado desatualizado.
 */
export async function getSessionClaims(): Promise<TenantClaims | null> {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  const usuario = await withTenantContext(
    { sub: user.id, role: "authenticated" },
    (tx) => usuarioRepository.findById(tx, user.id)
  )

  if (!usuario) {
    return null
  }

  return {
    sub: user.id,
    role: "authenticated",
    app_role: usuario.role,
    condominio_id: usuario.condominioId,
    nome: usuario.nome,
  }
}

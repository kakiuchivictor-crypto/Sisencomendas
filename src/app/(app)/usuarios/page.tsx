import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { withTenantContext } from "@/lib/db"
import { usuarioRepository } from "@/repositories/usuario-repository"
import { getSessionClaimsEstrita } from "@/services/auth/session"

import { UsuariosList } from "./usuarios-list"

export const metadata: Metadata = {
  title: "Usuários",
}

export default async function UsuariosPage() {
  const claims = await getSessionClaimsEstrita()

  if (!claims) {
    redirect("/login")
  }

  if (claims.app_role !== "desenvolvedor") {
    redirect("/")
  }

  const usuarios = await withTenantContext(claims, (tx) =>
    usuarioRepository.listByCondominio(tx)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Usuários</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie administradores e porteiros com acesso ao sistema.
        </p>
      </div>
      <UsuariosList initialUsuarios={usuarios} currentUserId={claims.sub} />
    </div>
  )
}

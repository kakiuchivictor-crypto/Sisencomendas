import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { withTenantContext } from "@/lib/db"
import { isAdminLike } from "@/lib/labels"
import { moradorRepository } from "@/repositories/morador-repository"
import { getSessionClaims } from "@/services/auth/session"

import { MoradoresList } from "./moradores-list"

export const metadata: Metadata = {
  title: "Moradores",
}

export default async function MoradoresPage() {
  const claims = await getSessionClaims()

  if (!claims) {
    redirect("/login")
  }

  const moradores = await withTenantContext(claims, (tx) =>
    moradorRepository.list(tx)
  )

  const canManage = isAdminLike(claims.app_role)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Moradores</h1>
        <p className="text-muted-foreground text-sm">
          {canManage
            ? "Cadastre e gerencie os moradores do condominio."
            : "Cadastre moradores. Edicao e exclusao ficam com o administrador."}
        </p>
      </div>
      <MoradoresList initialMoradores={moradores} canManage={canManage} />
    </div>
  )
}

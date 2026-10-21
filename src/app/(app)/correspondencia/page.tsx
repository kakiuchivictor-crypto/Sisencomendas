import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { withTenantContext } from "@/lib/db"
import { isAdminLike } from "@/lib/labels"
import { encomendaRepository } from "@/repositories/encomenda-repository"
import { getSessionClaims } from "@/services/auth/session"

import { EntreguesList } from "../entregues/entregues-list"
import { PendentesList } from "../_encomendas/pendentes-list"
import { NovaCorrespondenciaButton } from "./nova-correspondencia-button"

export const metadata: Metadata = {
  title: "Correspondência",
}

export default async function CorrespondenciaPage() {
  const claims = await getSessionClaims()

  if (!claims) {
    redirect("/login")
  }

  const { pendentes, entregues } = await withTenantContext(claims, async (tx) => {
    const [pendentes, entregues] = await Promise.all([
      encomendaRepository.listPendentes(tx, "correspondencia"),
      encomendaRepository.listEntregues(tx, 50, "correspondencia"),
    ])

    return { pendentes, entregues }
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Correspondencia</h1>
          <p className="text-muted-foreground text-sm">
            Cartas registradas para os moradores, separadas das encomendas.
          </p>
        </div>
        <NovaCorrespondenciaButton />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Pendentes</h2>
        <PendentesList
          initialPendentes={pendentes}
          categoria="correspondencia"
          allowEdit
          canManagePortaria={isAdminLike(claims.app_role)}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Entregues</h2>
        <EntreguesList
          initialEntregues={entregues}
          categoria="correspondencia"
          canDelete={isAdminLike(claims.app_role)}
        />
      </div>
    </div>
  )
}

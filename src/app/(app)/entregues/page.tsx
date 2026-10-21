import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { withTenantContext } from "@/lib/db"
import { isAdminLike } from "@/lib/labels"
import { encomendaRepository } from "@/repositories/encomenda-repository"
import { getSessionClaims } from "@/services/auth/session"

import { EntreguesList } from "./entregues-list"

export const metadata: Metadata = {
  title: "Entregues",
}

export default async function EntreguesPage() {
  const claims = await getSessionClaims()

  if (!claims) {
    redirect("/login")
  }

  const entregues = await withTenantContext(claims, (tx) =>
    encomendaRepository.listEntregues(tx)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Entregues</h1>
        <p className="text-muted-foreground text-sm">
          Encomendas ja entregues aos moradores.
        </p>
      </div>
      <EntreguesList
        initialEntregues={entregues}
        canDelete={isAdminLike(claims.app_role)}
      />
    </div>
  )
}

import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { withTenantContext } from "@/lib/db"
import { isAdminLike } from "@/lib/labels"
import { encomendaRepository } from "@/repositories/encomenda-repository"
import { getSessionClaims } from "@/services/auth/session"

import { HistoricoSearch } from "./historico-search"

export const metadata: Metadata = {
  title: "Histórico",
}

export default async function HistoricoPage() {
  const claims = await getSessionClaims()

  if (!claims) {
    redirect("/login")
  }

  const resultados = await withTenantContext(claims, (tx) =>
    encomendaRepository.search(tx, "")
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Histórico</h1>
        <p className="text-muted-foreground text-sm">
          Pesquise em todas as encomendas já registradas.
        </p>
      </div>
      <HistoricoSearch
        initialResults={resultados}
        canDelete={isAdminLike(claims.app_role)}
      />
    </div>
  )
}

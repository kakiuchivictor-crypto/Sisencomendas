import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { isAdminLike } from "@/lib/labels"
import { encomendaRepository } from "@/repositories/encomenda-repository"
import { withSession } from "@/services/auth/session"

import { HistoricoSearch } from "./historico-search"

export const metadata: Metadata = {
  title: "Histórico",
}

export default async function HistoricoPage() {
  const session = await withSession((tx) => encomendaRepository.search(tx, ""))

  if (!session) {
    redirect("/login")
  }

  const { dados: resultados, geradoEm } = session

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
        geradoEm={geradoEm}
        canDelete={isAdminLike(session.claims.app_role)}
      />
    </div>
  )
}

import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { isAdminLike } from "@/lib/labels"
import {
  ENCOMENDAS_PAGE_SIZE,
  encomendaRepository,
} from "@/repositories/encomenda-repository"
import { withSession } from "@/services/auth/session"

import { EntreguesList } from "../entregues/entregues-list"
import { PendentesList } from "../_encomendas/pendentes-list"
import { NovaCorrespondenciaButton } from "./nova-correspondencia-button"

export const metadata: Metadata = {
  title: "Correspondência",
}

export default async function CorrespondenciaPage() {
  const session = await withSession(async (tx) => {
    const [pendentes, entregues] = await Promise.all([
      encomendaRepository.listPendentes(tx, "correspondencia"),
      encomendaRepository.listEntregues(tx, ENCOMENDAS_PAGE_SIZE, "correspondencia"),
    ])

    return { pendentes, entregues }
  })

  if (!session) {
    redirect("/login")
  }

  const { geradoEm } = session
  const { pendentes, entregues } = session.dados
  const podeGerenciar = isAdminLike(session.claims.app_role)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Correspondência</h1>
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
          geradoEm={geradoEm}
          categoria="correspondencia"
          allowEdit
          canManagePortaria={podeGerenciar}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Entregues</h2>
        <EntreguesList
          initialEntregues={entregues}
          geradoEm={geradoEm}
          categoria="correspondencia"
          canDelete={podeGerenciar}
        />
      </div>
    </div>
  )
}

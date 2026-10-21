import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { isAdminLike } from "@/lib/labels"
import { encomendaRepository } from "@/repositories/encomenda-repository"
import { withSession } from "@/services/auth/session"

import { PendentesHeader } from "./_encomendas/pendentes-header"

export const metadata: Metadata = {
  title: "Pendentes",
}

export default async function HomePage() {
  // Sessao + indicadores + lista numa transacao so (consultas sem parametros,
  // enviadas juntas ao banco).
  const session = await withSession(async (tx) => {
    const [stats, pendentes] = await Promise.all([
      encomendaRepository.cardsStats(tx, "encomenda"),
      encomendaRepository.listPendentes(tx),
    ])

    return { stats, pendentes }
  })

  if (!session) {
    redirect("/login")
  }

  const { geradoEm } = session
  const { stats, pendentes } = session.dados

  return (
    <PendentesHeader
      initialPendentes={pendentes}
      initialStats={stats}
      geradoEm={geradoEm}
      canManagePortaria={isAdminLike(session.claims.app_role)}
    />
  )
}

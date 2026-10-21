import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { withTenantContext } from "@/lib/db"
import { isAdminLike } from "@/lib/labels"
import { encomendaRepository } from "@/repositories/encomenda-repository"
import { getSessionClaims } from "@/services/auth/session"

import { PendentesHeader } from "./_encomendas/pendentes-header"

export const metadata: Metadata = {
  title: "Pendentes",
}

export default async function HomePage() {
  const claims = await getSessionClaims()

  if (!claims) {
    redirect("/login")
  }

  const { stats, pendentes } = await withTenantContext(claims, async (tx) => {
    const [pendentesCount, recebidasHoje, entreguesHoje, pendentesAntigas, pendentes] =
      await Promise.all([
        encomendaRepository.countPendentes(tx),
        encomendaRepository.countRecebidasHoje(tx),
        encomendaRepository.countEntreguesHoje(tx),
        encomendaRepository.countPendentesAntigas(tx),
        encomendaRepository.listPendentes(tx),
      ])

    return {
      stats: {
        pendentes: pendentesCount,
        recebidasHoje,
        entreguesHoje,
        pendentesAntigas,
      },
      pendentes,
    }
  })

  return (
    <PendentesHeader
      initialPendentes={pendentes}
      initialStats={stats}
      canManagePortaria={isAdminLike(claims.app_role)}
    />
  )
}

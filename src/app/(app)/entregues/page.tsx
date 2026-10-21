import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { isAdminLike } from "@/lib/labels"
import { encomendaRepository } from "@/repositories/encomenda-repository"
import { withSession } from "@/services/auth/session"

import { EntreguesList } from "./entregues-list"

export const metadata: Metadata = {
  title: "Entregues",
}

export default async function EntreguesPage() {
  const session = await withSession((tx) => encomendaRepository.listEntregues(tx))

  if (!session) {
    redirect("/login")
  }

  const { dados: entregues, geradoEm } = session

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Entregues</h1>
        <p className="text-muted-foreground text-sm">
          Encomendas já entregues aos moradores.
        </p>
      </div>
      <EntreguesList
        initialEntregues={entregues}
        geradoEm={geradoEm}
        canDelete={isAdminLike(session.claims.app_role)}
      />
    </div>
  )
}

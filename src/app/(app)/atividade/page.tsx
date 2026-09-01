import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { withTenantContext } from "@/lib/db"
import { logRepository } from "@/repositories/log-repository"
import { getSessionClaims } from "@/services/auth/session"

import { AtividadeView } from "./atividade-view"

export const metadata: Metadata = {
  title: "Atividade — SisEncomendas",
}

export default async function AtividadePage() {
  const claims = await getSessionClaims()

  if (!claims) {
    redirect("/login")
  }

  if (claims.app_role !== "desenvolvedor") {
    redirect("/")
  }

  const initialLogs = await withTenantContext(claims, (tx) => logRepository.list(tx))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Atividade</h1>
        <p className="text-muted-foreground text-sm">
          Historico de acoes realizadas pelos usuarios do sistema.
        </p>
      </div>
      <AtividadeView initialLogs={initialLogs} />
    </div>
  )
}

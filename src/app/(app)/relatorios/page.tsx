import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { isAdminLike } from "@/lib/labels"
import { getSessionClaims } from "@/services/auth/session"

import { getReportAction } from "./actions"
import { RelatorioView } from "./relatorio-view"

export const metadata: Metadata = {
  title: "Relatórios",
}

export default async function RelatoriosPage() {
  const claims = await getSessionClaims()

  if (!claims) {
    redirect("/login")
  }

  if (!isAdminLike(claims.app_role)) {
    redirect("/")
  }

  const initialResult = await getReportAction({})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Relatorios</h1>
        <p className="text-muted-foreground text-sm">
          Analise encomendas por periodo, transportadora ou morador.
        </p>
      </div>
      <RelatorioView initialResult={initialResult} />
    </div>
  )
}

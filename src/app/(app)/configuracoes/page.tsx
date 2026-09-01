import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { withTenantContext } from "@/lib/db"
import { condominioRepository } from "@/repositories/condominio-repository"
import { getSessionClaims } from "@/services/auth/session"

import { ConfiguracoesForm } from "./configuracoes-form"

export const metadata: Metadata = {
  title: "Configuracoes — SisEncomendas",
}

export default async function ConfiguracoesPage() {
  const claims = await getSessionClaims()

  if (!claims) {
    redirect("/login")
  }

  if (claims.app_role !== "desenvolvedor") {
    redirect("/")
  }

  const condominio = await withTenantContext(claims, (tx) =>
    condominioRepository.findById(tx, claims.condominio_id)
  )

  if (!condominio) {
    redirect("/")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuracoes</h1>
        <p className="text-muted-foreground text-sm">
          Personalize o nome e o tema padrao do condominio.
        </p>
      </div>
      <ConfiguracoesForm condominio={condominio} />
    </div>
  )
}

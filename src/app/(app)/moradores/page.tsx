import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { isAdminLike } from "@/lib/labels"
import { moradorRepository } from "@/repositories/morador-repository"
import { withSession } from "@/services/auth/session"

import { MoradoresList } from "./moradores-list"

export const metadata: Metadata = {
  title: "Moradores",
}

export default async function MoradoresPage() {
  const session = await withSession((tx) => moradorRepository.list(tx))

  if (!session) {
    redirect("/login")
  }

  const moradores = session.dados
  const canManage = isAdminLike(session.claims.app_role)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Moradores</h1>
        <p className="text-muted-foreground text-sm">
          {canManage
            ? "Cadastre e gerencie os moradores do condomínio."
            : "Cadastre moradores. Edição e exclusão ficam com o administrador."}
        </p>
      </div>
      <MoradoresList initialMoradores={moradores} canManage={canManage} />
    </div>
  )
}

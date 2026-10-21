"use server"

import { redirect } from "next/navigation"

import { withTenantContext } from "@/lib/db"
import { encomendaRepository } from "@/repositories/encomenda-repository"
import { signOut } from "@/services/auth/auth-service"
import { getSessionClaims } from "@/services/auth/session"

export async function logoutAction(): Promise<void> {
  await signOut()
  redirect("/login")
}

export type NavCounts = {
  /** Encomendas pendentes (itens), mostrado na aba "Pendentes". */
  encomendas: number
  /** Correspondencias pendentes, mostrado na aba "Correspondencia". */
  correspondencias: number
}

/**
 * Contadores das abas do header/barra inferior. Sao so dois COUNT de
 * pendentes (os mesmos usados pelos stat cards), sem listar linhas.
 */
export async function getNavCountsAction(): Promise<NavCounts> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { encomendas: 0, correspondencias: 0 }
  }

  return withTenantContext(claims, async (tx) => {
    const [encomendas, correspondencias] = await Promise.all([
      encomendaRepository.countPendentes(tx, "encomenda"),
      encomendaRepository.countPendentes(tx, "correspondencia"),
    ])

    return { encomendas, correspondencias }
  })
}

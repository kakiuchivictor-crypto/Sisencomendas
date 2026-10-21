"use server"

import { encomendaRepository } from "@/repositories/encomenda-repository"
import { signOut } from "@/services/auth/auth-service"
import { withSession } from "@/services/auth/session"

/**
 * Encerra a sessao (apaga os cookies sb-*). Nao redireciona: quem chama
 * (useLogout) limpa o cache do TanStack e faz uma navegacao COMPLETA para
 * /login, para nao sobrar dado do usuario anterior em memoria no aparelho.
 */
export async function logoutAction(): Promise<void> {
  await signOut()
}

export type NavCounts = {
  /** Encomendas pendentes (itens), mostrado na aba "Pendentes". */
  encomendas: number
  /** Correspondencias pendentes, mostrado na aba "Correspondencia". */
  correspondencias: number
}

/**
 * Contadores das abas do header/barra inferior: uma consulta so (count
 * filter) dentro da mesma transacao que confere a sessao.
 */
export async function getNavCountsAction(): Promise<NavCounts> {
  const session = await withSession((tx) => encomendaRepository.navCounts(tx))

  return session?.dados ?? { encomendas: 0, correspondencias: 0 }
}

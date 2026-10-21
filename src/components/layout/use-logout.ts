"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useTransition } from "react"

import { logoutAction } from "@/app/(app)/actions"

/**
 * Logout que nao deixa dados do usuario anterior em memoria no aparelho
 * (portaria com celular/computador compartilhado entre porteiros):
 *  - limpa o cache do TanStack Query ANTES (nada mais e exibido a partir
 *    dele) e DEPOIS da action (descarta o que algum refetch em andamento
 *    tenha gravado no meio);
 *  - navega com window.location.assign (carga completa da pagina), e nao
 *    pela navegacao do Next: zera de vez o QueryClient, o cache do router do
 *    Next, o canal do Realtime e qualquer estado de componente.
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  function sair() {
    startTransition(async () => {
      queryClient.clear()
      await logoutAction()
      queryClient.clear()
      window.location.assign(new URL("/login", window.location.origin))
    })
  }

  return { sair, saindo: isPending }
}

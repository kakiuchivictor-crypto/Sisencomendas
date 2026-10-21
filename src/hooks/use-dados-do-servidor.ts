import { useQueryClient, type QueryKey } from "@tanstack/react-query"
import { useEffect } from "react"

/**
 * Usa o payload que veio do servidor (initialData da pagina) quando ele e MAIS
 * NOVO que o que ja esta no cache do TanStack Query. Sem isso, ao voltar para
 * uma aba depois de alguns minutos o servidor ja manda a lista atualizada, mas
 * o TanStack ignora o initialData (o cache ja tem dados, ainda que velhos) e
 * dispara mais uma Server Action para buscar exatamente a mesma coisa.
 *
 * Mesma regra do HydrationBoundary do TanStack: so sobrescreve se o payload
 * for mais recente (um payload reaproveitado do cache do router, mais velho
 * que o cache, nao apaga atualizacoes do Realtime/otimistas).
 *
 * `geradoEm` e o instante (ms) em que o servidor leu os dados.
 */
export function useDadosDoServidor<T>(
  queryKey: QueryKey,
  dados: T | undefined,
  geradoEm: number | undefined
) {
  const queryClient = useQueryClient()
  const chave = JSON.stringify(queryKey)

  useEffect(() => {
    if (dados === undefined || geradoEm === undefined) return

    const estado = queryClient.getQueryState(JSON.parse(chave) as QueryKey)
    if (estado && estado.dataUpdatedAt < geradoEm && estado.fetchStatus === "idle") {
      queryClient.setQueryData(JSON.parse(chave) as QueryKey, dados, {
        updatedAt: geradoEm,
      })
    }
  }, [queryClient, chave, dados, geradoEm])
}

/**
 * refetchOnMount para consultas com initialData do servidor: se o cache e
 * mais velho que o payload do servidor, nao busca de novo ao montar (o
 * useDadosDoServidor troca pelo payload); senao, segue a regra normal
 * (busca so se estiver "stale").
 */
export function refetchAoMontar(geradoEm: number | undefined) {
  return (query: { state: { dataUpdatedAt: number } }) =>
    geradoEm === undefined || query.state.dataUpdatedAt >= geradoEm
}

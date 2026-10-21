import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query"

/**
 * staleTime das consultas que o Realtime (RealtimeSync) ja mantem em dia:
 * pendentes, entregues, historico, indicadores, contadores das abas,
 * transportadoras e remetentes. Qualquer escrita em encomendas invalida essas
 * chaves na hora (pelo Realtime e pelas proprias acoes da tela), entao nao ha
 * motivo para refazer a busca so porque a pessoa trocou de aba. Continuam
 * valendo: refetch ao voltar o foco para a janela e o polling de 5 min (rede
 * de seguranca caso o websocket do Realtime caia).
 */
export const STALE_TIME_COM_REALTIME = 3 * 60 * 1000

/**
 * Invalida uma lista infinita (Entregues/Historico). Se a lista NAO esta na
 * tela (sem observadores), ela e cortada para a 1a pagina antes: quando a
 * pessoa voltar, so a 1a pagina e buscada de novo (em vez de refazer todas as
 * paginas ja roladas, uma Server Action por pagina, em fila). Se a lista esta
 * na tela, refaz todas as paginas carregadas para nao "pular" a rolagem.
 */
export function invalidarListaInfinita(queryClient: QueryClient, queryKey: QueryKey) {
  for (const query of queryClient.getQueryCache().findAll({ queryKey })) {
    if (query.getObserversCount() > 0) continue

    const data = query.state.data as InfiniteData<unknown, unknown> | undefined
    if (data && data.pages.length > 1) {
      queryClient.setQueryData<InfiniteData<unknown, unknown>>(
        query.queryKey,
        { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) },
        { updatedAt: query.state.dataUpdatedAt }
      )
    }
  }

  return queryClient.invalidateQueries({ queryKey })
}

/** Tudo que depende da tabela encomendas (usado pelo Realtime). */
export function invalidarConsultasDeEncomendas(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ["encomendas-pendentes"] })
  void queryClient.invalidateQueries({ queryKey: ["cards-stats"] })
  void queryClient.invalidateQueries({ queryKey: ["nav-counts"] })
  void invalidarListaInfinita(queryClient, ["encomendas-entregues"])
  void invalidarListaInfinita(queryClient, ["encomendas-historico"])
}

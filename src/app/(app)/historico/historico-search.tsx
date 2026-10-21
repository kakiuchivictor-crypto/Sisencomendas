"use client"

import { keepPreviousData, useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Search } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { refetchAoMontar, useDadosDoServidor } from "@/hooks/use-dados-do-servidor"
import { useInfiniteScrollSentinel } from "@/hooks/use-infinite-scroll-sentinel"
import { STALE_TIME_COM_REALTIME, invalidarListaInfinita } from "@/lib/query-invalidation"
import { cn } from "@/lib/utils"
import { ENCOMENDAS_PAGE_SIZE } from "@/repositories/encomenda-repository"
import type { EncomendaComDetalhes } from "@/types/domain"

import { agruparPorLote } from "../_encomendas/agrupar-por-lote"
import { EncomendaDetalheCard } from "../_encomendas/encomenda-detalhe-card"
import { searchEncomendasAction } from "../_encomendas/actions"

type Periodo = "todos" | "hoje" | "semana" | "mes"

const PERIODO_OPTIONS: { value: Periodo; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "7 dias" },
  { value: "mes", label: "30 dias" },
]

function periodoParaDesde(periodo: Periodo): Date | undefined {
  if (periodo === "todos") return undefined

  const agora = new Date()
  if (periodo === "hoje") {
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  }

  const desde = new Date(agora)
  desde.setDate(desde.getDate() - (periodo === "semana" ? 7 : 30))
  return desde
}

export function HistoricoSearch({
  initialResults,
  canDelete = false,
  geradoEm,
}: {
  initialResults: EncomendaComDetalhes[]
  canDelete?: boolean
  /** Instante (ms) em que o servidor leu initialResults (ver useDadosDoServidor). */
  geradoEm?: number
}) {
  const [search, setSearch] = useState("")
  const [periodo, setPeriodo] = useState<Periodo>("todos")
  const debouncedSearch = useDebouncedValue(search, 250)
  const desde = periodoParaDesde(periodo)
  const queryClient = useQueryClient()
  const semFiltro = !debouncedSearch && periodo === "todos"
  const initialDataServidor = useMemo(
    () => ({ pages: [initialResults], pageParams: [0] }),
    [initialResults]
  )
  const initialData = semFiltro ? initialDataServidor : undefined

  // So a busca sem filtro corresponde ao payload do servidor.
  useDadosDoServidor(["encomendas-historico", "", "todos"], initialData, geradoEm)

  const { data, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } =
    useInfiniteQuery({
      queryKey: ["encomendas-historico", debouncedSearch, periodo],
      queryFn: ({ pageParam }) =>
        searchEncomendasAction(debouncedSearch, "encomenda", pageParam, desde),
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length < ENCOMENDAS_PAGE_SIZE
          ? undefined
          : allPages.reduce((total, page) => total + page.length, 0),
      initialData,
      initialDataUpdatedAt: semFiltro ? geradoEm : undefined,
      refetchOnMount: refetchAoMontar(semFiltro ? geradoEm : undefined),
      placeholderData: keepPreviousData,
      staleTime: STALE_TIME_COM_REALTIME,
    })

  const sentinelRef = useInfiniteScrollSentinel({
    hasNextPage,
    isFetchingNextPage,
    onLoadMore: () => void fetchNextPage(),
  })

  function handleReverted() {
    void refetch()
    void queryClient.invalidateQueries({ queryKey: ["encomendas-pendentes"] })
    void invalidarListaInfinita(queryClient, ["encomendas-entregues"])
    void queryClient.invalidateQueries({ queryKey: ["cards-stats"] })
    void queryClient.invalidateQueries({ queryKey: ["nav-counts"] })
  }

  function handleDeleted() {
    void refetch()
    void invalidarListaInfinita(queryClient, ["encomendas-entregues"])
    void queryClient.invalidateQueries({ queryKey: ["cards-stats"] })
    void queryClient.invalidateQueries({ queryKey: ["nav-counts"] })
  }

  const list = data?.pages.flat() ?? []

  return (
    <div className="space-y-4">
      <div className="relative">
        {isFetching ? (
          <Loader2 className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2 animate-spin" />
        ) : (
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        )}
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por morador, rua, número ou transportadora..."
          className="pl-8"
          autoFocus
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PERIODO_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={periodo === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriodo(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center">
          {isFetching ? "Buscando..." : "Nenhuma encomenda encontrada."}
        </p>
      ) : (
        <div
          className={cn(
            "space-y-3 transition-opacity",
            isFetching && "opacity-60"
          )}
        >
          {agruparPorLote(list).map(({ loteId, itens }) => (
            <EncomendaDetalheCard
              key={loteId}
              itens={itens}
              canDelete={canDelete}
              onReverted={handleReverted}
              onDeleted={handleDeleted}
            />
          ))}

          {hasNextPage && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {isFetchingNextPage && (
                <Loader2 className="text-muted-foreground size-5 animate-spin" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

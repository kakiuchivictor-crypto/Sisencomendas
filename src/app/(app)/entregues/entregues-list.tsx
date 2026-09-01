"use client"

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, PackageCheck } from "lucide-react"

import { useInfiniteScrollSentinel } from "@/hooks/use-infinite-scroll-sentinel"
import {
  ENCOMENDAS_PAGE_SIZE,
  type EncomendaCategoria,
} from "@/repositories/encomenda-repository"
import type { EncomendaComDetalhes } from "@/types/domain"

import { agruparPorLote } from "../_encomendas/agrupar-por-lote"
import { EncomendaDetalheCard } from "../_encomendas/encomenda-detalhe-card"
import { listEntreguesAction } from "../_encomendas/actions"

export function EntreguesList({
  initialEntregues,
  categoria = "encomenda",
  canDelete = false,
}: {
  initialEntregues: EncomendaComDetalhes[]
  categoria?: EncomendaCategoria
  canDelete?: boolean
}) {
  const queryClient = useQueryClient()
  const queryKey = ["encomendas-entregues", categoria]

  const { data, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam }) => listEntreguesAction(categoria, pageParam),
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length < ENCOMENDAS_PAGE_SIZE
          ? undefined
          : allPages.reduce((total, page) => total + page.length, 0),
      initialData: { pages: [initialEntregues], pageParams: [0] },
    })

  const sentinelRef = useInfiniteScrollSentinel({
    hasNextPage,
    isFetchingNextPage,
    onLoadMore: () => void fetchNextPage(),
  })

  function handleReverted() {
    void refetch()
    void queryClient.invalidateQueries({ queryKey: ["encomendas-pendentes", categoria] })
    void queryClient.invalidateQueries({ queryKey: ["cards-stats", categoria] })
  }

  function handleDeleted() {
    void refetch()
    void queryClient.invalidateQueries({ queryKey: ["cards-stats", categoria] })
  }

  const list = data?.pages.flat() ?? []

  if (list.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16">
        <PackageCheck className="size-8" />
        <p>
          {categoria === "correspondencia"
            ? "Nenhuma correspondencia entregue ainda."
            : "Nenhuma encomenda entregue ainda."}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
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
  )
}

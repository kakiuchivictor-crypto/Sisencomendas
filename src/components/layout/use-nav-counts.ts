"use client"

import { useQuery } from "@tanstack/react-query"

import { getNavCountsAction, type NavCounts } from "@/app/(app)/actions"
import { STALE_TIME_COM_REALTIME } from "@/lib/query-invalidation"

export const NAV_COUNTS_QUERY_KEY = ["nav-counts"] as const

/**
 * Contadores das abas (Pendentes / Correspondencia). O valor inicial vem do
 * layout (SSR); depois o RealtimeSync invalida a query a cada mudanca em
 * encomendas, e o polling cobre o caso de a aba ficar parada.
 */
export function useNavCounts(initialCounts: NavCounts) {
  const { data } = useQuery({
    queryKey: NAV_COUNTS_QUERY_KEY,
    queryFn: () => getNavCountsAction(),
    initialData: initialCounts,
    // O Realtime invalida a cada mudanca em encomendas.
    staleTime: STALE_TIME_COM_REALTIME,
    refetchInterval: 5 * 60 * 1000,
  })

  return data ?? initialCounts
}

export type NavCountKey = keyof NavCounts

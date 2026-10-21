"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"

// Varios itens de uma mesma acao (ex: lote com 5 itens sendo entregue) disparam
// varios eventos do Postgres Changes quase juntos — sem agrupar, cada um
// dispararia sua propria rodada de invalidacao/refetch.
const INVALIDATE_DEBOUNCE_MS = 800

/**
 * Mantem as telas de encomendas/correspondencia atualizadas sozinhas: assina
 * mudancas em sisencomendas.encomendas via Supabase Realtime (Postgres
 * Changes) filtradas pelo condominio do usuario, e invalida as queries do
 * React Query correspondentes sempre que algo muda — mesmo que a mudanca
 * tenha sido feita por outra pessoa, em outra tela. RLS ja garante que so
 * chegam eventos de linhas visiveis para este usuario; o filtro aqui e so
 * uma otimizacao (menos trafego), nao a fonte de isolamento.
 */
export function RealtimeSync({ condominioId }: { condominioId: string }) {
  const queryClient = useQueryClient()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    const channel = supabase
      .channel(`encomendas-${condominioId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "sisencomendas",
          table: "encomendas",
          filter: `condominio_id=eq.${condominioId}`,
        },
        () => {
          if (debounceRef.current) {
            clearTimeout(debounceRef.current)
          }
          debounceRef.current = setTimeout(() => {
            void queryClient.invalidateQueries({ queryKey: ["encomendas-pendentes"] })
            void queryClient.invalidateQueries({ queryKey: ["encomendas-entregues"] })
            void queryClient.invalidateQueries({ queryKey: ["cards-stats"] })
            void queryClient.invalidateQueries({ queryKey: ["encomendas-historico"] })
            void queryClient.invalidateQueries({ queryKey: ["nav-counts"] })
          }, INVALIDATE_DEBOUNCE_MS)
        }
      )
      .subscribe()

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      void supabase.removeChannel(channel)
    }
  }, [condominioId, queryClient])

  return null
}

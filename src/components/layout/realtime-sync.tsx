"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

import { invalidarConsultasDeEncomendas } from "@/lib/query-invalidation"

// Varios itens de uma mesma acao (ex: lote com 5 itens sendo entregue) disparam
// varios eventos do Postgres Changes quase juntos — sem agrupar, cada um
// dispararia sua propria rodada de invalidacao/refetch.
const INVALIDATE_DEBOUNCE_MS = 800

/** Espera o navegador ficar ocioso (ou no maximo `timeout` ms). */
function quandoOcioso(callback: () => void, timeout = 2000): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout })
    return () => window.cancelIdleCallback(id)
  }
  // Safari nao tem requestIdleCallback.
  const id = window.setTimeout(callback, 1)
  return () => window.clearTimeout(id)
}

/**
 * Mantem as telas de encomendas/correspondencia atualizadas sozinhas: assina
 * mudancas em sisencomendas.encomendas via Supabase Realtime (Postgres
 * Changes) filtradas pelo condominio do usuario, e invalida as queries do
 * React Query correspondentes sempre que algo muda — mesmo que a mudanca
 * tenha sido feita por outra pessoa, em outra tela. RLS ja garante que so
 * chegam eventos de linhas visiveis para este usuario; o filtro aqui e so
 * uma otimizacao (menos trafego), nao a fonte de isolamento.
 *
 * O client Supabase (~70 KB gzip) e carregado por import() dinamico depois da
 * montagem, quando o navegador fica ocioso: assim ele nao entra no bundle
 * inicial nem atrasa a primeira tela. As telas ja chegam com os dados do
 * servidor, entao o atraso de alguns milissegundos para assinar o canal nao
 * perde nada que importe (o refetch ao focar/intervalo cobre a janela).
 */
export function RealtimeSync({ condominioId }: { condominioId: string }) {
  const queryClient = useQueryClient()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelado = false
    let encerrar: (() => void) | null = null

    const cancelarOcioso = quandoOcioso(() => {
      void import("@/lib/supabase/client").then(({ createSupabaseBrowserClient }) => {
        if (cancelado) return

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
                invalidarConsultasDeEncomendas(queryClient)
              }, INVALIDATE_DEBOUNCE_MS)
            }
          )
          .subscribe()

        encerrar = () => {
          void supabase.removeChannel(channel)
        }
      })
    })

    return () => {
      cancelado = true
      cancelarOcioso()
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      encerrar?.()
    }
  }, [condominioId, queryClient])

  return null
}

"use client"

import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle2, Inbox, Package } from "lucide-react"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { EncomendaCategoria } from "@/repositories/encomenda-repository"
import { cn } from "@/lib/utils"

import type { CardsStats } from "./actions"
import { getCardsStatsAction } from "./actions"

export function StatCards({
  initialStats,
  categoria = "encomenda",
  onAtrasadasClick,
  atrasadasActive = false,
}: {
  initialStats: CardsStats
  categoria?: EncomendaCategoria
  /** Quando informado, o card "Pendentes ha mais de 7 dias" vira um filtro clicavel. */
  onAtrasadasClick?: () => void
  atrasadasActive?: boolean
}) {
  const { data } = useQuery({
    queryKey: ["cards-stats", categoria],
    queryFn: () => getCardsStatsAction(categoria),
    initialData: initialStats,
    // O Realtime (RealtimeSync) ja invalida essa query a cada mudanca no
    // banco — esse polling e so uma rede de seguranca para o contador de
    // "mais de 7 dias", que muda sozinho com o passar do tempo, sem
    // nenhuma escrita no banco que o Realtime possa notificar.
    refetchInterval: 5 * 60 * 1000,
  })

  const stats = data ?? initialStats

  const cards = [
    { label: "Pendentes", value: stats.pendentes, icon: Package },
    { label: "Recebidas hoje", value: stats.recebidasHoje, icon: Inbox },
    { label: "Entregues hoje", value: stats.entreguesHoje, icon: CheckCircle2 },
    {
      label: "Pendentes ha mais de 7 dias",
      value: stats.pendentesAntigas,
      icon: AlertTriangle,
      warn: stats.pendentesAntigas > 0,
      clickable: Boolean(onAtrasadasClick) && stats.pendentesAntigas > 0,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          onClick={card.clickable ? onAtrasadasClick : undefined}
          role={card.clickable ? "button" : undefined}
          tabIndex={card.clickable ? 0 : undefined}
          onKeyDown={
            card.clickable
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onAtrasadasClick?.()
                  }
                }
              : undefined
          }
          aria-pressed={card.clickable ? atrasadasActive : undefined}
          className={cn(
            card.warn && "ring-destructive/25 bg-destructive/[0.03]",
            card.clickable &&
              "cursor-pointer transition-shadow hover:ring-destructive/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            card.clickable && atrasadasActive && "ring-2 ring-destructive/60"
          )}
        >
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium">
                {card.label}
                {card.clickable && (
                  <span className="text-muted-foreground/70 hidden font-normal sm:inline">
                    {" "}
                    · {atrasadasActive ? "filtrando" : "clique p/ filtrar"}
                  </span>
                )}
              </CardDescription>
              <card.icon
                className={cn(
                  "size-4",
                  card.warn ? "text-destructive" : "text-primary/70"
                )}
              />
            </div>
            <CardTitle className="font-mono text-3xl font-semibold tabular-nums">
              {card.value}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

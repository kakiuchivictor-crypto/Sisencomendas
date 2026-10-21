"use client"

import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle2, Filter, Inbox, Package, X } from "lucide-react"

import { Card } from "@/components/ui/card"
import type { EncomendaCategoria } from "@/repositories/encomenda-repository"
import { cn } from "@/lib/utils"

import type { CardsStats } from "./actions"
import { getCardsStatsAction } from "./actions"

/**
 * Faixa unica de indicadores (KPIs). O ultimo, "Mais de 7 dias", vira um
 * botao de filtro quando onAtrasadasClick e informado.
 */
export function StatCards({
  initialStats,
  categoria = "encomenda",
  onAtrasadasClick,
  atrasadasActive = false,
}: {
  initialStats: CardsStats
  categoria?: EncomendaCategoria
  /** Quando informado, o indicador "Mais de 7 dias" vira um filtro clicavel. */
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

  const kpis = [
    { label: "Pendentes", value: stats.pendentes, icon: Package },
    { label: "Recebidas hoje", value: stats.recebidasHoje, icon: Inbox },
    { label: "Entregues hoje", value: stats.entreguesHoje, icon: CheckCircle2 },
  ]

  const atrasadas = stats.pendentesAntigas
  const warn = atrasadas > 0
  // Continua clicavel com 0 se o filtro estiver ligado, para poder desligar.
  const clickable = Boolean(onAtrasadasClick) && (warn || atrasadasActive)

  const cellClassName =
    "flex min-w-0 flex-col gap-1 border-border px-4 py-3.5 sm:px-5 [&:nth-child(n+3)]:border-t md:[&:nth-child(n+3)]:border-t-0 [&:nth-child(even)]:border-l md:[&:not(:first-child)]:border-l"

  const atrasadasContent = (
    <>
      <span className="flex items-center gap-1.5 text-xs font-semibold">
        <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
        Mais de 7 dias
      </span>
      <span className="font-mono text-2xl leading-tight font-semibold tracking-tight tabular-nums sm:text-3xl">
        {atrasadas}
      </span>
      {clickable && (
        <span className="flex items-center gap-1 text-xs font-medium">
          {atrasadasActive ? (
            <>
              <X className="size-3.5 shrink-0" aria-hidden />
              Filtrando · toque para limpar
            </>
          ) : (
            <>
              <Filter className="size-3.5 shrink-0" aria-hidden />
              Toque para filtrar
            </>
          )}
        </span>
      )}
    </>
  )

  const atrasadasClassName = cn(
    cellClassName,
    "text-left",
    warn ? "bg-danger-soft text-danger-ink" : "text-muted-foreground",
    clickable &&
      "cursor-pointer transition-colors outline-none hover:bg-[color-mix(in_oklch,var(--danger-soft),var(--danger-ink)_8%)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
    clickable &&
      atrasadasActive &&
      "bg-destructive text-destructive-foreground hover:bg-[color-mix(in_oklch,var(--destructive),black_10%)]"
  )

  return (
    <Card className="grid grid-cols-2 gap-0 py-0 md:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className={cellClassName}>
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold">
            <kpi.icon className="text-primary/70 size-3.5 shrink-0" aria-hidden />
            {kpi.label}
          </span>
          <span className="font-mono text-2xl leading-tight font-semibold tracking-tight tabular-nums sm:text-3xl">
            {kpi.value}
          </span>
        </div>
      ))}

      {clickable ? (
        <button
          type="button"
          onClick={onAtrasadasClick}
          aria-pressed={atrasadasActive}
          // Nome fixo: o estado (ligado/desligado) fica so no aria-pressed.
          aria-label={`Filtrar pendentes há mais de 7 dias: ${atrasadas}`}
          className={atrasadasClassName}
        >
          {atrasadasContent}
        </button>
      ) : (
        <div className={atrasadasClassName}>{atrasadasContent}</div>
      )}
    </Card>
  )
}

"use client"

import { useState } from "react"

import type { EncomendaComDetalhes } from "@/types/domain"

import type { CardsStats } from "./actions"
import { NovaEncomendaButton } from "./nova-encomenda-button"
import { type PendentesFiltro, PendentesList } from "./pendentes-list"
import { PendentesSearchInput } from "./pendentes-search-input"
import { StatCards } from "./stat-cards"

/**
 * Agrupa titulo + busca + botao "Nova encomenda" + KPIs + filtros + lista na
 * mesma arvore client-side — o indicador "Mais de 7 dias" e os chips de
 * filtro alteram a lista abaixo, entao todos compartilham o estado.
 */
export function PendentesHeader({
  initialPendentes,
  initialStats,
  canManagePortaria = false,
}: {
  initialPendentes: EncomendaComDetalhes[]
  initialStats: CardsStats
  canManagePortaria?: boolean
}) {
  const [busca, setBusca] = useState("")
  const [filtro, setFiltro] = useState<PendentesFiltro>("todas")

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pendentes</h1>
          <p className="text-muted-foreground text-sm">
            Encomendas aguardando retirada pelo morador.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <PendentesSearchInput
            value={busca}
            onChange={setBusca}
            className="min-w-0 flex-1 sm:w-64 sm:flex-none"
          />
          <NovaEncomendaButton />
        </div>
      </div>

      <StatCards
        initialStats={initialStats}
        onAtrasadasClick={() =>
          setFiltro((current) => (current === "atrasadas" ? "todas" : "atrasadas"))
        }
        atrasadasActive={filtro === "atrasadas"}
      />

      <PendentesList
        initialPendentes={initialPendentes}
        busca={busca}
        onBuscaChange={setBusca}
        filtro={filtro}
        onFiltroChange={setFiltro}
        canManagePortaria={canManagePortaria}
      />
    </div>
  )
}

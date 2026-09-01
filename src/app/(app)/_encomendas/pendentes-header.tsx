"use client"

import { X } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { EncomendaComDetalhes } from "@/types/domain"

import type { CardsStats } from "./actions"
import { NovaEncomendaButton } from "./nova-encomenda-button"
import { PendentesList } from "./pendentes-list"
import { PendentesSearchInput } from "./pendentes-search-input"
import { StatCards } from "./stat-cards"

/**
 * Agrupa stats + titulo + busca + botao "Nova encomenda" + lista na mesma
 * arvore client-side — o clique no card "Pendentes ha mais de 7 dias" filtra
 * a lista abaixo, entao os dois precisam compartilhar estado.
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
  const [apenasAtrasadas, setApenasAtrasadas] = useState(false)

  return (
    <div className="space-y-6">
      <StatCards
        initialStats={initialStats}
        onAtrasadasClick={() => setApenasAtrasadas((current) => !current)}
        atrasadasActive={apenasAtrasadas}
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">Encomendas pendentes</h1>
            {apenasAtrasadas && (
              <Badge
                variant="outline"
                className="border-destructive/40 text-destructive gap-1 pr-1"
              >
                Mais de 7 dias
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remover filtro de atraso"
                  className="hover:bg-destructive/10 size-4"
                  onClick={() => setApenasAtrasadas(false)}
                >
                  <X />
                </Button>
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PendentesSearchInput
              value={busca}
              onChange={setBusca}
              className="w-full sm:w-56"
            />
            <NovaEncomendaButton />
          </div>
        </div>

        <PendentesList
          initialPendentes={initialPendentes}
          busca={busca}
          onBuscaChange={setBusca}
          apenasAtrasadas={apenasAtrasadas}
          canManagePortaria={canManagePortaria}
        />
      </div>
    </div>
  )
}

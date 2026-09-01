"use server"

import { withTenantContext } from "@/lib/db"
import { isAdminLike, type Transportadora } from "@/lib/labels"
import { encomendaRepository } from "@/repositories/encomenda-repository"
import { getSessionClaims } from "@/services/auth/session"
import type { EncomendaComDetalhes, EncomendaStatus } from "@/types/domain"

export type ReportFiltersInput = {
  from?: string
  to?: string
  transportadora?: Transportadora
  moradorId?: string
  status?: EncomendaStatus
}

export type ReportResult = {
  encomendas: EncomendaComDetalhes[]
  totalPendentes: number
  totalEntregues: number
  tempoMedioSegundos: number | null
  /** Data de inicio efetivamente aplicada (ISO, so a parte da data) — repassada pra
   * UI conseguir mostrar qual periodo padrao foi usado quando nenhum filtro e informado. */
  fromAplicado: string
}

const EMPTY_RESULT: ReportResult = {
  encomendas: [],
  totalPendentes: 0,
  totalEntregues: 0,
  tempoMedioSegundos: null,
  fromAplicado: "",
}

/** Sem filtro de data, "relatorios" varreria o historico inteiro do condominio
 * pra sempre — limita a uma janela padrao razoavel, que o usuario pode
 * alargar manualmente escolhendo uma data em "De". */
const DEFAULT_RANGE_DAYS = 90

export async function getReportAction(
  filters: ReportFiltersInput
): Promise<ReportResult> {
  const claims = await getSessionClaims()

  if (!claims || !isAdminLike(claims.app_role)) {
    return EMPTY_RESULT
  }

  const from = filters.from
    ? new Date(`${filters.from}T00:00:00`)
    : new Date(Date.now() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000)

  const parsedFilters = {
    from,
    to: filters.to ? new Date(`${filters.to}T23:59:59.999`) : undefined,
    transportadora: filters.transportadora,
    moradorId: filters.moradorId,
    status: filters.status,
  }

  return withTenantContext(claims, async (tx) => {
    const [encomendas, tempoMedioSegundos, counts] = await Promise.all([
      encomendaRepository.report(tx, parsedFilters),
      encomendaRepository.averageRetrievalSeconds(tx, parsedFilters),
      encomendaRepository.reportCounts(tx, parsedFilters),
    ])

    return {
      encomendas,
      ...counts,
      tempoMedioSegundos,
      fromAplicado: from.toISOString().slice(0, 10),
    }
  })
}

import { and, desc, gte, lt, or, ilike, type SQL } from "drizzle-orm"

import type { Transaction } from "@/lib/db"
import { logAtividade } from "@/db/schema"
import type { LogAcao } from "@/types/domain"

export type RecordLogInput = {
  condominioId: string
  usuarioId: string
  usuarioNome: string
  acao: LogAcao
  descricao: string
  entidadeId?: string | null
}

export type LogFilters = {
  from?: Date
  to?: Date
  term?: string
}

function buildFilterConditions(filters: LogFilters): SQL[] {
  const conditions: SQL[] = []

  if (filters.from) {
    conditions.push(gte(logAtividade.createdAt, filters.from))
  }
  if (filters.to) {
    conditions.push(lt(logAtividade.createdAt, filters.to))
  }
  if (filters.term) {
    const pattern = `%${filters.term.trim()}%`
    conditions.push(
      or(ilike(logAtividade.usuarioNome, pattern), ilike(logAtividade.descricao, pattern))!
    )
  }

  return conditions
}

export const logRepository = {
  /**
   * usuario_nome vem do chamador (getSessionClaims ja carregou esse dado pra
   * sessao) em vez de ser re-consultado aqui — evita 1 SELECT extra em toda
   * acao que grava no log, que ja e uma escrita adicional por si so.
   */
  async record(tx: Transaction, input: RecordLogInput) {
    await tx.insert(logAtividade).values({
      condominioId: input.condominioId,
      usuarioId: input.usuarioId,
      usuarioNome: input.usuarioNome,
      acao: input.acao,
      descricao: input.descricao,
      entidadeId: input.entidadeId ?? null,
    })
  },

  async list(tx: Transaction, filters: LogFilters = {}, limit = 200) {
    const conditions = buildFilterConditions(filters)

    return tx
      .select()
      .from(logAtividade)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(logAtividade.createdAt))
      .limit(limit)
  },
}

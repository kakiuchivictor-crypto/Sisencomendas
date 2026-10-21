import { and, asc, count, eq, sql } from "drizzle-orm"

import type { Transaction } from "@/lib/db"
import { transportadoras } from "@/db/schema"
import { TRANSPORTADORAS_LIST_LIMIT } from "@/lib/transportadoras"

export type NewTransportadoraInput = {
  condominioId: string
  /** Já normalizado pela action (espaços colapsados, 1..60 caracteres). */
  nome: string
}

export const transportadoraRepository = {
  /** Catálogo do condomínio (RLS filtra pelo tenant), em ordem alfabética. */
  async list(tx: Transaction, limit = TRANSPORTADORAS_LIST_LIMIT) {
    return tx
      .select()
      .from(transportadoras)
      .orderBy(asc(sql`lower(${transportadoras.nome})`), asc(transportadoras.nome))
      .limit(limit)
  },

  async count(tx: Transaction, condominioId: string) {
    const [row] = await tx
      .select({ value: count() })
      .from(transportadoras)
      .where(eq(transportadoras.condominioId, condominioId))

    return row?.value ?? 0
  },

  /** Busca case-insensitive, igual ao índice único (condominio_id, lower(nome)). */
  async findByNome(tx: Transaction, condominioId: string, nome: string) {
    const [transportadora] = await tx
      .select()
      .from(transportadoras)
      .where(
        and(
          eq(transportadoras.condominioId, condominioId),
          sql`lower(${transportadoras.nome}) = lower(${nome})`
        )
      )
      .limit(1)

    return transportadora ?? null
  },

  /**
   * Idempotente: se o nome já existe (em qualquer caixa), não insere e
   * devolve o registro existente — dois porteiros cadastrando "J&T" ao
   * mesmo tempo não geram erro de unicidade.
   */
  async create(tx: Transaction, data: NewTransportadoraInput) {
    await tx.insert(transportadoras).values(data).onConflictDoNothing()

    const transportadora = await transportadoraRepository.findByNome(tx, data.condominioId, data.nome)

    if (!transportadora) {
      throw new Error("Falha ao cadastrar transportadora")
    }

    return transportadora
  },
}

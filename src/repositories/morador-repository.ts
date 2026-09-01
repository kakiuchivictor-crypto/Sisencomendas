import { asc, count, eq, ilike, or } from "drizzle-orm"

import type { Transaction } from "@/lib/db"
import { moradores } from "@/db/schema"

export type NewMoradorInput = {
  condominioId: string
  nome: string
  rua: string
  numero: string
  observacoes?: string | null
}

export type UpdateMoradorInput = {
  nome: string
  rua: string
  numero: string
  observacoes?: string | null
}

export const moradorRepository = {
  async count(tx: Transaction) {
    const [row] = await tx.select({ value: count() }).from(moradores)
    return row?.value ?? 0
  },

  async list(tx: Transaction, search?: string) {
    if (!search?.trim()) {
      return tx.select().from(moradores).orderBy(asc(moradores.nome))
    }

    const pattern = `%${search.trim()}%`

    return tx
      .select()
      .from(moradores)
      .where(or(ilike(moradores.nome, pattern), ilike(moradores.rua, pattern)))
      .orderBy(asc(moradores.nome))
  },

  async findById(tx: Transaction, id: string) {
    const [morador] = await tx
      .select()
      .from(moradores)
      .where(eq(moradores.id, id))
      .limit(1)

    return morador ?? null
  },

  async create(tx: Transaction, data: NewMoradorInput) {
    const [morador] = await tx.insert(moradores).values(data).returning()

    if (!morador) {
      throw new Error("Falha ao criar morador")
    }

    return morador
  },

  async update(tx: Transaction, id: string, data: UpdateMoradorInput) {
    const [morador] = await tx
      .update(moradores)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(moradores.id, id))
      .returning()

    return morador ?? null
  },

  async remove(tx: Transaction, id: string) {
    const [morador] = await tx.delete(moradores).where(eq(moradores.id, id)).returning()
    return morador ?? null
  },
}

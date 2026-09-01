import { asc, eq } from "drizzle-orm"

import type { Transaction } from "@/lib/db"
import { remetentes } from "@/db/schema"

export type NewRemetenteInput = {
  condominioId: string
  nome: string
}

export const remetenteRepository = {
  async list(tx: Transaction) {
    return tx.select().from(remetentes).orderBy(asc(remetentes.nome))
  },

  async findById(tx: Transaction, id: string) {
    const [remetente] = await tx
      .select()
      .from(remetentes)
      .where(eq(remetentes.id, id))
      .limit(1)

    return remetente ?? null
  },

  async create(tx: Transaction, data: NewRemetenteInput) {
    const [remetente] = await tx.insert(remetentes).values(data).returning()

    if (!remetente) {
      throw new Error("Falha ao cadastrar remetente")
    }

    return remetente
  },
}

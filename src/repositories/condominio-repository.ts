import { eq } from "drizzle-orm"

import type { Transaction } from "@/lib/db"
import { condominios } from "@/db/schema"
import type { Tema } from "@/types/domain"

export type UpdateCondominioInput = {
  nome: string
  tema: Tema
}

export const condominioRepository = {
  async findById(tx: Transaction, id: string) {
    const [condominio] = await tx
      .select()
      .from(condominios)
      .where(eq(condominios.id, id))
      .limit(1)

    return condominio ?? null
  },

  async update(tx: Transaction, id: string, data: UpdateCondominioInput) {
    const [condominio] = await tx
      .update(condominios)
      .set({ nome: data.nome, tema: data.tema })
      .where(eq(condominios.id, id))
      .returning()

    return condominio ?? null
  },
}

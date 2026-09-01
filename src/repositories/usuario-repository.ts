import { eq } from "drizzle-orm"

import type { Transaction } from "@/lib/db"
import { usuarios } from "@/db/schema"
import type { UsuarioRole } from "@/types/domain"

export type NewUsuarioInput = {
  id: string
  condominioId: string
  nome: string
  email: string
  role: UsuarioRole
}

export type UpdateUsuarioInput = {
  nome: string
  role: UsuarioRole
}

const listSelection = {
  id: usuarios.id,
  nome: usuarios.nome,
  role: usuarios.role,
  email: usuarios.email,
  createdAt: usuarios.createdAt,
}

export const usuarioRepository = {
  async findById(tx: Transaction, id: string) {
    const [usuario] = await tx
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, id))
      .limit(1)

    return usuario ?? null
  },

  async listByCondominio(tx: Transaction) {
    return tx.select(listSelection).from(usuarios).orderBy(usuarios.nome)
  },

  /**
   * So insere o perfil em sisencomendas.usuarios — o id ja precisa existir em
   * auth.users, criado antes via supabase.auth.admin.createUser() (Admin API,
   * service_role). O app nunca insere em auth.users diretamente: isso e
   * responsabilidade exclusiva do GoTrue no Supabase real.
   */
  async create(tx: Transaction, data: NewUsuarioInput) {
    const [usuario] = await tx
      .insert(usuarios)
      .values({
        id: data.id,
        condominioId: data.condominioId,
        nome: data.nome,
        email: data.email.toLowerCase().trim(),
        role: data.role,
      })
      .returning()

    if (!usuario) {
      throw new Error("Falha ao criar usuario")
    }

    return usuario
  },

  async update(tx: Transaction, id: string, data: UpdateUsuarioInput) {
    const [usuario] = await tx
      .update(usuarios)
      .set(data)
      .where(eq(usuarios.id, id))
      .returning()

    return usuario ?? null
  },

  /**
   * Remove apenas a linha de "usuarios" (perfil). O caller (deleteUsuarioAction)
   * tambem remove o usuario em auth.users via Admin API, senao a conta ficaria
   * autenticavel no Supabase Auth mas sem perfil — causando um loop de
   * redirecionamento entre "/" e "/login" (ver proxy.ts).
   */
  async remove(tx: Transaction, id: string) {
    const [usuario] = await tx.delete(usuarios).where(eq(usuarios.id, id)).returning()
    return usuario ?? null
  },
}

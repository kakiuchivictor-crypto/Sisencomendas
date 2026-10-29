"use server"

import { revalidatePath } from "next/cache"

import { isForeignKeyViolation } from "@/lib/db-errors"
import { withTenantContext } from "@/lib/db"
import { isAdminLike } from "@/lib/labels"
import { encomendaRepository } from "@/repositories/encomenda-repository"
import { logRepository } from "@/repositories/log-repository"
import { moradorRepository } from "@/repositories/morador-repository"
import { idParamSchema } from "@/schemas/action-params"
import { moradorSchema } from "@/schemas/morador"
import { getSessionClaims } from "@/services/auth/session"
import type { Morador } from "@/types/domain"

export async function listMoradoresAction(search?: string): Promise<Morador[]> {
  const claims = await getSessionClaims()

  if (!claims) {
    return []
  }

  return withTenantContext(claims, (tx) => moradorRepository.list(tx, search))
}

export type MoradorActionResult =
  | { success: true; morador: Morador }
  | { success: false; error: string }

export async function createMoradorAction(
  input: unknown
): Promise<MoradorActionResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessão expirada. Faça login novamente." }
  }

  const parsed = moradorSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: "Preencha os campos obrigatórios." }
  }

  const morador = await withTenantContext(claims, async (tx) => {
    const criado = await moradorRepository.create(tx, {
      condominioId: claims.condominio_id,
      ...parsed.data,
      observacoes: parsed.data.observacoes || null,
    })

    await logRepository.record(tx, {
      condominioId: claims.condominio_id,
      usuarioId: claims.sub,
      usuarioNome: claims.nome,
      acao: "morador_criado",
      descricao: `Cadastrou o morador ${criado.nome} (${criado.rua}, ${criado.numero})`,
      entidadeId: criado.id,
    })

    return criado
  })

  revalidatePath("/moradores")

  return { success: true, morador }
}

export async function updateMoradorAction(
  id: string,
  input: unknown
): Promise<MoradorActionResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessão expirada. Faça login novamente." }
  }

  if (!isAdminLike(claims.app_role)) {
    return {
      success: false,
      error: "Apenas administradores podem editar moradores.",
    }
  }

  const parsed = moradorSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: "Preencha os campos obrigatórios." }
  }

  const morador = await withTenantContext(claims, async (tx) => {
    const atualizado = await moradorRepository.update(tx, id, {
      ...parsed.data,
      observacoes: parsed.data.observacoes || null,
    })

    if (atualizado) {
      await logRepository.record(tx, {
        condominioId: claims.condominio_id,
        usuarioId: claims.sub,
        usuarioNome: claims.nome,
        acao: "morador_atualizado",
        descricao: `Atualizou o morador ${atualizado.nome} (${atualizado.rua}, ${atualizado.numero})`,
        entidadeId: atualizado.id,
      })
    }

    return atualizado
  })

  if (!morador) {
    return { success: false, error: "Morador não encontrado." }
  }

  revalidatePath("/moradores")

  return { success: true, morador }
}

export type DeleteMoradorActionResult = { success: true } | { success: false; error: string }

export async function deleteMoradorAction(
  id: string
): Promise<DeleteMoradorActionResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessão expirada. Faça login novamente." }
  }

  if (!isAdminLike(claims.app_role)) {
    return {
      success: false,
      error: "Apenas administradores podem excluir moradores.",
    }
  }

  try {
    await withTenantContext(claims, async (tx) => {
      const removido = await moradorRepository.remove(tx, id)

      if (removido) {
        await logRepository.record(tx, {
          condominioId: claims.condominio_id,
          usuarioId: claims.sub,
          usuarioNome: claims.nome,
          acao: "morador_excluido",
          descricao: `Excluiu o morador ${removido.nome} (${removido.rua}, ${removido.numero})`,
          entidadeId: removido.id,
        })
      }
    })
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return {
        success: false,
        error:
          "Este morador possui encomendas registradas. Transfira-as para o cadastro correto antes de excluir.",
      }
    }

    throw error
  }

  revalidatePath("/moradores")

  return { success: true }
}

export type EncomendasDoMorador = { total: number; pendentes: number }

/** Usado no diálogo de exclusão para saber se é preciso transferir encomendas. */
export async function contarEncomendasMoradorAction(
  id: string
): Promise<EncomendasDoMorador | null> {
  const claims = await getSessionClaims()

  if (!claims || !isAdminLike(claims.app_role) || !idParamSchema.safeParse(id).success) {
    return null
  }

  return withTenantContext(claims, (tx) => encomendaRepository.contarPorMorador(tx, id))
}

/**
 * Junta um cadastro duplicado (ou com nome errado) no cadastro correto:
 * transfere todas as encomendas — pendentes e entregues — para o destino e
 * exclui a origem, tudo na mesma transação. O histórico continua completo,
 * agora no nome certo.
 */
export async function transferirEExcluirMoradorAction(
  origemId: string,
  destinoId: string
): Promise<DeleteMoradorActionResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessão expirada. Faça login novamente." }
  }

  if (!isAdminLike(claims.app_role)) {
    return {
      success: false,
      error: "Apenas administradores podem excluir moradores.",
    }
  }

  if (!idParamSchema.safeParse(origemId).success || !idParamSchema.safeParse(destinoId).success) {
    return { success: false, error: "Dados inválidos. Recarregue a página e tente novamente." }
  }

  if (origemId === destinoId) {
    return { success: false, error: "Escolha outro morador para receber as encomendas." }
  }

  const resultado = await withTenantContext(claims, async (tx) => {
    const origem = await moradorRepository.findById(tx, origemId)
    const destino = await moradorRepository.findById(tx, destinoId)

    if (!origem || !destino) {
      return null
    }

    const transferidas = await encomendaRepository.transferirMorador(tx, origem.id, destino)
    await moradorRepository.remove(tx, origem.id)

    await logRepository.record(tx, {
      condominioId: claims.condominio_id,
      usuarioId: claims.sub,
      usuarioNome: claims.nome,
      acao: "morador_excluido",
      descricao: `Excluiu o morador ${origem.nome} (${origem.rua}, ${origem.numero}) e transferiu ${transferidas} encomenda(s) para ${destino.nome} (${destino.rua}, ${destino.numero})`,
      entidadeId: origem.id,
    })

    return { transferidas }
  })

  if (!resultado) {
    return { success: false, error: "Morador não encontrado. Recarregue a página." }
  }

  revalidatePath("/moradores")

  return { success: true }
}

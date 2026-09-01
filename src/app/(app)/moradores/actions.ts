"use server"

import { revalidatePath } from "next/cache"

import { isForeignKeyViolation } from "@/lib/db-errors"
import { withTenantContext } from "@/lib/db"
import { isAdminLike } from "@/lib/labels"
import { logRepository } from "@/repositories/log-repository"
import { moradorRepository } from "@/repositories/morador-repository"
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
    return { success: false, error: "Sessao expirada. Faca login novamente." }
  }

  const parsed = moradorSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: "Preencha os campos obrigatorios." }
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
    return { success: false, error: "Sessao expirada. Faca login novamente." }
  }

  if (!isAdminLike(claims.app_role)) {
    return {
      success: false,
      error: "Apenas administradores podem editar moradores.",
    }
  }

  const parsed = moradorSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: "Preencha os campos obrigatorios." }
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
    return { success: false, error: "Morador nao encontrado." }
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
    return { success: false, error: "Sessao expirada. Faca login novamente." }
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
          "Nao e possivel excluir: este morador possui encomendas registradas.",
      }
    }

    throw error
  }

  revalidatePath("/moradores")

  return { success: true }
}

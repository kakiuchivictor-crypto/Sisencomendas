"use server"

import { revalidatePath } from "next/cache"

import { withTenantContext } from "@/lib/db"
import { condominioRepository } from "@/repositories/condominio-repository"
import { logRepository } from "@/repositories/log-repository"
import { condominioSchema } from "@/schemas/condominio"
import { getSessionClaimsEstrita } from "@/services/auth/session"
import type { Condominio } from "@/types/domain"

export type CondominioActionResult =
  | { success: true; condominio: Condominio }
  | { success: false; error: string }

export async function updateCondominioAction(
  input: unknown
): Promise<CondominioActionResult> {
  const claims = await getSessionClaimsEstrita()

  if (!claims) {
    return { success: false, error: "Sessão expirada. Faça login novamente." }
  }

  if (claims.app_role !== "desenvolvedor") {
    return {
      success: false,
      error: "Apenas administradores podem alterar as configurações.",
    }
  }

  const parsed = condominioSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: "Preencha os campos obrigatórios." }
  }

  const condominio = await withTenantContext(claims, async (tx) => {
    const atualizado = await condominioRepository.update(tx, claims.condominio_id, {
      nome: parsed.data.nome,
      tema: parsed.data.tema,
    })

    if (atualizado) {
      await logRepository.record(tx, {
        condominioId: claims.condominio_id,
        usuarioId: claims.sub,
        usuarioNome: claims.nome,
        acao: "configuracoes_atualizadas",
        descricao: `Atualizou as configurações do condomínio (nome: ${atualizado.nome})`,
        entidadeId: atualizado.id,
      })
    }

    return atualizado
  })

  if (!condominio) {
    return { success: false, error: "Condomínio não encontrado." }
  }

  revalidatePath("/configuracoes")
  revalidatePath("/")

  return { success: true, condominio }
}

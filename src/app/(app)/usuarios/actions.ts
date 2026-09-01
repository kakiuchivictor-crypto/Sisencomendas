"use server"

import { revalidatePath } from "next/cache"

import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db-errors"
import { withTenantContext } from "@/lib/db"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { logRepository } from "@/repositories/log-repository"
import { usuarioRepository } from "@/repositories/usuario-repository"
import { usuarioCreateSchema, usuarioUpdateSchema } from "@/schemas/usuario"
import { getSessionClaims } from "@/services/auth/session"
import type { Usuario } from "@/types/domain"

export type UsuarioActionResult =
  | { success: true; usuario: Usuario }
  | { success: false; error: string }

export async function listUsuariosAction() {
  const claims = await getSessionClaims()

  if (!claims) return []

  return withTenantContext(claims, (tx) => usuarioRepository.listByCondominio(tx))
}

export async function createUsuarioAction(
  input: unknown
): Promise<UsuarioActionResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessao expirada. Faca login novamente." }
  }

  if (claims.app_role !== "desenvolvedor") {
    return { success: false, error: "Apenas administradores podem cadastrar usuarios." }
  }

  const parsed = usuarioCreateSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: "Preencha os campos obrigatorios." }
  }

  const admin = createSupabaseAdminClient()
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.senha,
    email_confirm: true,
  })

  if (authError || !authUser.user) {
    if (authError?.code === "email_exists") {
      return { success: false, error: "Este email ja esta em uso." }
    }
    return { success: false, error: "Falha ao criar credenciais do usuario." }
  }

  try {
    const usuario = await withTenantContext(claims, async (tx) => {
      const criado = await usuarioRepository.create(tx, {
        id: authUser.user.id,
        condominioId: claims.condominio_id,
        nome: parsed.data.nome,
        email: parsed.data.email,
        role: parsed.data.role,
      })

      await logRepository.record(tx, {
        condominioId: claims.condominio_id,
        usuarioId: claims.sub,
        usuarioNome: claims.nome,
        acao: "usuario_criado",
        descricao: `Cadastrou o usuario ${criado.nome} (${criado.email})`,
        entidadeId: criado.id,
      })

      return criado
    })

    revalidatePath("/usuarios")

    return { success: true, usuario }
  } catch (error) {
    // Perfil falhou apos a conta de auth ja ter sido criada — desfaz para
    // nao deixar um usuario "fantasma" (autentica mas nunca aparece no app).
    await admin.auth.admin.deleteUser(authUser.user.id)

    if (isUniqueViolation(error)) {
      return { success: false, error: "Este email ja esta em uso." }
    }

    throw error
  }
}

export async function updateUsuarioAction(
  id: string,
  input: unknown
): Promise<UsuarioActionResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessao expirada. Faca login novamente." }
  }

  if (claims.app_role !== "desenvolvedor") {
    return { success: false, error: "Apenas administradores podem editar usuarios." }
  }

  const parsed = usuarioUpdateSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: "Preencha os campos obrigatorios." }
  }

  const usuario = await withTenantContext(claims, async (tx) => {
    const atualizado = await usuarioRepository.update(tx, id, parsed.data)

    if (atualizado) {
      await logRepository.record(tx, {
        condominioId: claims.condominio_id,
        usuarioId: claims.sub,
        usuarioNome: claims.nome,
        acao: "usuario_atualizado",
        descricao: `Atualizou o usuario ${atualizado.nome} (${atualizado.email})`,
        entidadeId: atualizado.id,
      })
    }

    return atualizado
  })

  if (!usuario) {
    return { success: false, error: "Usuario nao encontrado." }
  }

  revalidatePath("/usuarios")

  return { success: true, usuario }
}

export type DeleteUsuarioActionResult = { success: true } | { success: false; error: string }

export async function deleteUsuarioAction(id: string): Promise<DeleteUsuarioActionResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessao expirada. Faca login novamente." }
  }

  if (claims.app_role !== "desenvolvedor") {
    return { success: false, error: "Apenas administradores podem excluir usuarios." }
  }

  if (id === claims.sub) {
    return { success: false, error: "Voce nao pode excluir seu proprio usuario." }
  }

  try {
    await withTenantContext(claims, async (tx) => {
      const removido = await usuarioRepository.remove(tx, id)

      if (removido) {
        await logRepository.record(tx, {
          condominioId: claims.condominio_id,
          usuarioId: claims.sub,
          usuarioNome: claims.nome,
          acao: "usuario_excluido",
          descricao: `Excluiu o usuario ${removido.nome} (${removido.email})`,
          entidadeId: removido.id,
        })
      }
    })
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return {
        success: false,
        error: "Nao e possivel excluir: este usuario possui encomendas registradas.",
      }
    }

    throw error
  }

  // Remove tambem a conta no Supabase Auth — sem isso a pessoa continuaria
  // conseguindo autenticar (so sem perfil), o que trava o app num loop de
  // redirecionamento entre "/" e "/login".
  await createSupabaseAdminClient().auth.admin.deleteUser(id)

  revalidatePath("/usuarios")

  return { success: true }
}

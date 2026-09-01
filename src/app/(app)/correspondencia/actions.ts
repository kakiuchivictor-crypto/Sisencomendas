"use server"

import { randomUUID } from "node:crypto"

import { revalidatePath } from "next/cache"

import { withTenantContext } from "@/lib/db"
import { encomendaRepository } from "@/repositories/encomenda-repository"
import { logRepository } from "@/repositories/log-repository"
import { moradorRepository } from "@/repositories/morador-repository"
import { remetenteRepository } from "@/repositories/remetente-repository"
import {
  correspondenciaAddItemSchema,
  correspondenciaCreateSchema,
  correspondenciaUpdateSchema,
} from "@/schemas/correspondencia"
import { getSessionClaims } from "@/services/auth/session"
import type { Encomenda, Remetente } from "@/types/domain"

export type CorrespondenciaActionResult =
  | { success: true; correspondencia: Encomenda }
  | { success: false; error: string }

export async function createCorrespondenciaAction(
  input: unknown
): Promise<CorrespondenciaActionResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessao expirada. Faca login novamente." }
  }

  const parsed = correspondenciaCreateSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: "Preencha os campos obrigatorios." }
  }

  const correspondencia = await withTenantContext(claims, async (tx) => {
    const criada = await encomendaRepository.create(tx, {
      loteId: randomUUID(),
      condominioId: claims.condominio_id,
      moradorId: parsed.data.moradorId,
      rua: parsed.data.rua,
      numero: parsed.data.numero,
      remetenteId: parsed.data.remetenteId,
      tipo: "carta",
      quantidade: parsed.data.quantidade,
      codigoRastreio: parsed.data.codigoRastreio || null,
      observacoes: parsed.data.observacoes || null,
      recebidaPor: claims.sub,
    })

    const morador = await moradorRepository.findById(tx, parsed.data.moradorId)
    await logRepository.record(tx, {
      condominioId: claims.condominio_id,
      usuarioId: claims.sub,
      usuarioNome: claims.nome,
      acao: "correspondencia_criada",
      descricao: `Registrou correspondencia para ${morador?.nome ?? "morador"} (${parsed.data.rua}, ${parsed.data.numero})`,
      entidadeId: criada.loteId,
    })

    return criada
  })

  revalidatePath("/correspondencia")

  return { success: true, correspondencia }
}

export async function updateCorrespondenciaAction(
  id: string,
  input: unknown
): Promise<CorrespondenciaActionResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessao expirada. Faca login novamente." }
  }

  const parsed = correspondenciaUpdateSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: "Preencha os campos obrigatorios." }
  }

  const correspondencia = await withTenantContext(claims, (tx) =>
    encomendaRepository.update(tx, id, {
      moradorId: parsed.data.moradorId,
      rua: parsed.data.rua,
      numero: parsed.data.numero,
      remetenteId: parsed.data.remetenteId,
      tipo: "carta",
      quantidade: parsed.data.quantidade,
      codigoRastreio: parsed.data.codigoRastreio || null,
      observacoes: parsed.data.observacoes || null,
    })
  )

  if (!correspondencia) {
    return {
      success: false,
      error: "Correspondencia nao encontrada ou ja foi entregue.",
    }
  }

  revalidatePath("/correspondencia")

  return { success: true, correspondencia }
}

/** Mesma logica de "adicionar item" das encomendas, mas pra correspondencia (remetente em vez de transportadora). */
export async function addItemToCorrespondenciaLoteAction(
  loteId: string,
  input: unknown
): Promise<CorrespondenciaActionResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessao expirada. Faca login novamente." }
  }

  const parsed = correspondenciaAddItemSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: "Preencha os campos obrigatorios." }
  }

  const correspondencia = await withTenantContext(claims, async (tx) => {
    const existente = await encomendaRepository.findOneByLoteId(tx, loteId)

    if (!existente || existente.status !== "pendente") {
      return null
    }

    const criada = await encomendaRepository.create(tx, {
      loteId,
      condominioId: claims.condominio_id,
      moradorId: existente.moradorId,
      rua: existente.rua,
      numero: existente.numero,
      remetenteId: parsed.data.remetenteId,
      tipo: "carta",
      quantidade: parsed.data.quantidade,
      codigoRastreio: parsed.data.codigoRastreio || null,
      recebidaPor: claims.sub,
    })

    const morador = await moradorRepository.findById(tx, existente.moradorId)
    await logRepository.record(tx, {
      condominioId: claims.condominio_id,
      usuarioId: claims.sub,
      usuarioNome: claims.nome,
      acao: "item_adicionado_lote",
      descricao: `Adicionou 1 correspondencia para ${morador?.nome ?? "morador"} (${existente.rua}, ${existente.numero})`,
      entidadeId: loteId,
    })

    return criada
  })

  if (!correspondencia) {
    return {
      success: false,
      error: "Nao encontrada ou ja entregue — nao e possivel adicionar itens.",
    }
  }

  revalidatePath("/correspondencia")

  return { success: true, correspondencia }
}

export type ListRemetentesResult = Remetente[]

export async function listRemetentesAction(): Promise<ListRemetentesResult> {
  const claims = await getSessionClaims()

  if (!claims) return []

  return withTenantContext(claims, (tx) => remetenteRepository.list(tx))
}

export type CreateRemetenteResult =
  | { success: true; remetente: Remetente }
  | { success: false; error: string }

export async function createRemetenteAction(
  nome: string
): Promise<CreateRemetenteResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessao expirada. Faca login novamente." }
  }

  const nomeTrimmed = nome.trim()

  if (!nomeTrimmed) {
    return { success: false, error: "Informe o nome do remetente." }
  }

  try {
    const remetente = await withTenantContext(claims, (tx) =>
      remetenteRepository.create(tx, {
        condominioId: claims.condominio_id,
        nome: nomeTrimmed,
      })
    )

    revalidatePath("/correspondencia")

    return { success: true, remetente }
  } catch {
    return { success: false, error: "Este remetente ja existe." }
  }
}

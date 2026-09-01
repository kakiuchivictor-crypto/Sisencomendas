"use server"

import { randomUUID } from "node:crypto"

import { revalidatePath } from "next/cache"

import { withTenantContext } from "@/lib/db"
import {
  encomendaAddItemSchema,
  encomendaCreateSchema,
  encomendaUpdateSchema,
} from "@/schemas/encomenda"
import { isAdminLike, type TipoEncomenda, type Transportadora } from "@/lib/labels"
import {
  ENCOMENDAS_PAGE_SIZE,
  encomendaRepository,
  type EncomendaCategoria,
} from "@/repositories/encomenda-repository"
import { logRepository } from "@/repositories/log-repository"
import { moradorRepository } from "@/repositories/morador-repository"
import { getSessionClaims } from "@/services/auth/session"
import type { Encomenda, EncomendaComDetalhes } from "@/types/domain"

export type EncomendaActionResult =
  | { success: true; encomendas: Encomenda[] }
  | { success: false; error: string }

export async function createEncomendaAction(
  input: unknown
): Promise<EncomendaActionResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessao expirada. Faca login novamente." }
  }

  const parsed = encomendaCreateSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: "Preencha os campos obrigatorios." }
  }

  const { itens, ...compartilhado } = parsed.data
  // Mesmo lote para todos os itens desta submissao — entregar qualquer um
  // deles da baixa no lote inteiro de uma vez (ver encomendaRepository.entregar).
  const loteId = randomUUID()

  const encomendasCriadas = await withTenantContext(claims, async (tx) => {
    const criadas: Encomenda[] = []

    // Insercoes sequenciais de proposito: postgres.js nao suporta queries
    // concorrentes numa mesma transacao/conexao (Promise.all aqui causaria
    // interleaving de comandos na mesma conexao).
    for (const item of itens) {
      const encomenda = await encomendaRepository.create(tx, {
        loteId,
        condominioId: claims.condominio_id,
        moradorId: compartilhado.moradorId,
        rua: compartilhado.rua,
        numero: compartilhado.numero,
        transportadora: item.transportadora as Transportadora,
        transportadoraOutro: item.transportadoraOutro || null,
        tipo: item.tipo as TipoEncomenda,
        quantidade: item.quantidade,
        codigoRastreio: item.codigoRastreio || null,
        notaFiscal: item.notaFiscal || null,
        observacoes: compartilhado.observacoes || null,
        recebidaPor: claims.sub,
      })
      criadas.push(encomenda)
    }

    const morador = await moradorRepository.findById(tx, compartilhado.moradorId)
    await logRepository.record(tx, {
      condominioId: claims.condominio_id,
      usuarioId: claims.sub,
      usuarioNome: claims.nome,
      acao: "encomenda_criada",
      descricao: `Registrou ${criadas.length} item(ns) para ${morador?.nome ?? "morador"} (${compartilhado.rua}, ${compartilhado.numero})`,
      entidadeId: loteId,
    })

    return criadas
  })

  revalidatePath("/")
  revalidatePath("/historico")

  return { success: true, encomendas: encomendasCriadas }
}

export async function updateEncomendaAction(
  id: string,
  input: unknown
): Promise<EncomendaActionResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessao expirada. Faca login novamente." }
  }

  const parsed = encomendaUpdateSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: "Preencha os campos obrigatorios." }
  }

  const encomenda = await withTenantContext(claims, (tx) =>
    encomendaRepository.update(tx, id, {
      moradorId: parsed.data.moradorId,
      rua: parsed.data.rua,
      numero: parsed.data.numero,
      transportadora: parsed.data.transportadora as Transportadora,
      transportadoraOutro: parsed.data.transportadoraOutro || null,
      tipo: parsed.data.tipo as TipoEncomenda,
      quantidade: parsed.data.quantidade,
      codigoRastreio: parsed.data.codigoRastreio || null,
      notaFiscal: parsed.data.notaFiscal || null,
      observacoes: parsed.data.observacoes || null,
    })
  )

  if (!encomenda) {
    return {
      success: false,
      error: "Encomenda nao encontrada ou ja foi entregue.",
    }
  }

  revalidatePath("/")
  revalidatePath("/historico")

  return { success: true, encomendas: [encomenda] }
}

/**
 * Adiciona um item novo a um lote PENDENTE ja existente (ex: chegou mais uma
 * encomenda pro mesmo morador enquanto a anterior ainda nao foi retirada).
 * O item novo herda morador/rua/numero do lote, mas tem sua propria
 * transportadora/tipo/rastreio/recebida_por/recebida_em — e assim que fica
 * visivel, no card, que foi outra pessoa (ou outro dia) que adicionou aquele
 * item especifico.
 */
export async function addItemToEncomendaLoteAction(
  loteId: string,
  input: unknown
): Promise<EncomendaActionResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessao expirada. Faca login novamente." }
  }

  const parsed = encomendaAddItemSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: "Preencha os campos obrigatorios." }
  }

  const encomenda = await withTenantContext(claims, async (tx) => {
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
      transportadora: parsed.data.transportadora as Transportadora,
      transportadoraOutro: parsed.data.transportadoraOutro || null,
      tipo: parsed.data.tipo as TipoEncomenda,
      quantidade: parsed.data.quantidade,
      codigoRastreio: parsed.data.codigoRastreio || null,
      notaFiscal: parsed.data.notaFiscal || null,
      observacoes: parsed.data.observacoes || null,
      recebidaPor: claims.sub,
    })

    const morador = await moradorRepository.findById(tx, existente.moradorId)
    await logRepository.record(tx, {
      condominioId: claims.condominio_id,
      usuarioId: claims.sub,
      usuarioNome: claims.nome,
      acao: "item_adicionado_lote",
      descricao: `Adicionou 1 item para ${morador?.nome ?? "morador"} (${existente.rua}, ${existente.numero})`,
      entidadeId: loteId,
    })

    return criada
  })

  if (!encomenda) {
    return {
      success: false,
      error: "Lote nao encontrado ou ja foi entregue — nao e possivel adicionar itens.",
    }
  }

  revalidatePath("/")
  revalidatePath("/historico")
  revalidatePath("/correspondencia")

  return { success: true, encomendas: [encomenda] }
}

export type EntregarActionResult = { success: true } | { success: false; error: string }

export async function entregarAction(
  id: string,
  retiradoPor: string
): Promise<EntregarActionResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessao expirada. Faca login novamente." }
  }

  const nomeRetirou = retiradoPor.trim()

  if (!nomeRetirou) {
    return { success: false, error: "Informe o nome de quem retirou a encomenda." }
  }

  const entregues = await withTenantContext(claims, async (tx) => {
    const rows = await encomendaRepository.entregar(tx, id, claims.sub, nomeRetirou)

    if (rows.length > 0) {
      const morador = await moradorRepository.findById(tx, rows[0]!.moradorId)
      await logRepository.record(tx, {
        condominioId: claims.condominio_id,
        usuarioId: claims.sub,
        usuarioNome: claims.nome,
        acao: "encomenda_entregue",
        descricao: `Entregou ${rows.length} item(ns) para ${morador?.nome ?? "morador"} (${rows[0]!.rua}, ${rows[0]!.numero}) — retirado por ${nomeRetirou}`,
        entidadeId: rows[0]!.loteId,
      })
    }

    return rows
  })

  if (entregues.length === 0) {
    return { success: false, error: "Encomenda ja foi entregue ou nao existe." }
  }

  revalidatePath("/")
  revalidatePath("/entregues")
  revalidatePath("/historico")
  revalidatePath("/correspondencia")

  return { success: true }
}

/**
 * Entrega so o item informado, deixando o resto do lote pendente — para
 * quando o lote tem varios itens mas so um foi retirado.
 */
export async function entregarItemAction(
  id: string,
  retiradoPor: string
): Promise<EntregarActionResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessao expirada. Faca login novamente." }
  }

  const nomeRetirou = retiradoPor.trim()

  if (!nomeRetirou) {
    return { success: false, error: "Informe o nome de quem retirou a encomenda." }
  }

  const entregues = await withTenantContext(claims, async (tx) => {
    const rows = await encomendaRepository.entregarItem(tx, id, claims.sub, nomeRetirou)

    if (rows.length > 0) {
      const morador = await moradorRepository.findById(tx, rows[0]!.moradorId)
      await logRepository.record(tx, {
        condominioId: claims.condominio_id,
        usuarioId: claims.sub,
        usuarioNome: claims.nome,
        acao: "encomenda_entregue",
        descricao: `Entregou 1 item (entrega parcial do lote) para ${morador?.nome ?? "morador"} (${rows[0]!.rua}, ${rows[0]!.numero}) — retirado por ${nomeRetirou}`,
        entidadeId: rows[0]!.loteId,
      })
    }

    return rows
  })

  if (entregues.length === 0) {
    return { success: false, error: "Item ja foi entregue ou nao existe." }
  }

  revalidatePath("/")
  revalidatePath("/entregues")
  revalidatePath("/historico")
  revalidatePath("/correspondencia")

  return { success: true }
}

export type VoltarParaPendenteResult =
  | { success: true }
  | { success: false; error: string }

export async function voltarParaPendenteAction(
  id: string
): Promise<VoltarParaPendenteResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessao expirada. Faca login novamente." }
  }

  const revertidas = await withTenantContext(claims, async (tx) => {
    const rows = await encomendaRepository.voltarParaPendente(tx, id)

    if (rows.length > 0) {
      const morador = await moradorRepository.findById(tx, rows[0]!.moradorId)
      await logRepository.record(tx, {
        condominioId: claims.condominio_id,
        usuarioId: claims.sub,
        usuarioNome: claims.nome,
        acao: "encomenda_revertida",
        descricao: `Voltou ${rows.length} item(ns) de ${morador?.nome ?? "morador"} para pendente (${rows[0]!.rua}, ${rows[0]!.numero})`,
        entidadeId: rows[0]!.loteId,
      })
    }

    return rows
  })

  if (revertidas.length === 0) {
    return { success: false, error: "Encomenda ja esta pendente ou nao existe." }
  }

  revalidatePath("/")
  revalidatePath("/entregues")
  revalidatePath("/historico")
  revalidatePath("/correspondencia")

  return { success: true }
}

export type DeixadoPortariaResult = { success: true } | { success: false; error: string }

/**
 * Marca/desmarca um lote pendente como "deixado na portaria pela
 * administracao" — so administracao/desenvolvedor podem ativar ou desativar
 * (porteiro so enxerga o resultado no card, sem controle). Dupla checagem:
 * aqui na action (mensagem de erro clara) e a RLS de update tenant-scoped ja
 * cobre a escrita em si.
 */
export async function toggleDeixadoPortariaAction(
  loteId: string,
  ativo: boolean
): Promise<DeixadoPortariaResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessao expirada. Faca login novamente." }
  }

  if (!isAdminLike(claims.app_role)) {
    return {
      success: false,
      error: "Apenas administracao ou desenvolvedor podem sinalizar a portaria.",
    }
  }

  const atualizadas = await withTenantContext(claims, async (tx) => {
    const rows = await encomendaRepository.setDeixadoPortaria(
      tx,
      loteId,
      ativo ? claims.sub : null
    )

    if (rows.length > 0) {
      const morador = await moradorRepository.findById(tx, rows[0]!.moradorId)
      await logRepository.record(tx, {
        condominioId: claims.condominio_id,
        usuarioId: claims.sub,
        usuarioNome: claims.nome,
        acao: ativo ? "encomenda_deixada_portaria" : "encomenda_retirada_portaria",
        descricao: `${ativo ? "Marcou" : "Desmarcou"} ${rows.length} item(ns) de ${morador?.nome ?? "morador"} como deixado(s) na portaria (${rows[0]!.rua}, ${rows[0]!.numero})`,
        entidadeId: rows[0]!.loteId,
      })
    }

    return rows
  })

  if (atualizadas.length === 0) {
    return { success: false, error: "Lote nao encontrado ou ja foi entregue." }
  }

  revalidatePath("/")
  revalidatePath("/correspondencia")

  return { success: true }
}

export type ExcluirEncomendaResult = { success: true } | { success: false; error: string }

/**
 * So desenvolvedor/administracao excluem, e so encomendas ja entregues — a
 * RLS (encomendas_delete_desenvolvedor) reforca a mesma regra no banco, essa
 * checagem aqui e so pra dar um erro de UI mais claro antes de bater no banco.
 */
export async function excluirEncomendaAction(id: string): Promise<ExcluirEncomendaResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessao expirada. Faca login novamente." }
  }

  if (!isAdminLike(claims.app_role)) {
    return { success: false, error: "Apenas administradores podem excluir encomendas." }
  }

  const excluidas = await withTenantContext(claims, async (tx) => {
    const rows = await encomendaRepository.removeLote(tx, id)

    if (rows.length > 0) {
      const morador = await moradorRepository.findById(tx, rows[0]!.moradorId)
      await logRepository.record(tx, {
        condominioId: claims.condominio_id,
        usuarioId: claims.sub,
        usuarioNome: claims.nome,
        acao: "encomenda_excluida",
        descricao: `Excluiu ${rows.length} item(ns) de ${morador?.nome ?? "morador"} (${rows[0]!.rua}, ${rows[0]!.numero})`,
        entidadeId: rows[0]!.loteId,
      })
    }

    return rows
  })

  if (excluidas.length === 0) {
    return {
      success: false,
      error: "Encomenda nao encontrada ou ainda pendente (so entregues podem ser excluidas).",
    }
  }

  revalidatePath("/entregues")
  revalidatePath("/historico")
  revalidatePath("/correspondencia")

  return { success: true }
}

export async function listPendentesAction(
  categoria: EncomendaCategoria = "encomenda"
): Promise<EncomendaComDetalhes[]> {
  const claims = await getSessionClaims()

  if (!claims) return []

  return withTenantContext(claims, (tx) =>
    encomendaRepository.listPendentes(tx, categoria)
  )
}

export async function listEntreguesAction(
  categoria: EncomendaCategoria = "encomenda",
  offset = 0
): Promise<EncomendaComDetalhes[]> {
  const claims = await getSessionClaims()

  if (!claims) return []

  return withTenantContext(claims, (tx) =>
    encomendaRepository.listEntregues(tx, ENCOMENDAS_PAGE_SIZE, categoria, offset)
  )
}

export async function searchEncomendasAction(
  term: string,
  categoria: EncomendaCategoria = "encomenda",
  offset = 0,
  desde?: Date
): Promise<EncomendaComDetalhes[]> {
  const claims = await getSessionClaims()

  if (!claims) return []

  return withTenantContext(claims, (tx) =>
    encomendaRepository.search(tx, term, ENCOMENDAS_PAGE_SIZE, categoria, offset, desde)
  )
}

export type CardsStats = {
  pendentes: number
  recebidasHoje: number
  entreguesHoje: number
  pendentesAntigas: number
}

export async function getCardsStatsAction(
  categoria: EncomendaCategoria = "encomenda"
): Promise<CardsStats> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { pendentes: 0, recebidasHoje: 0, entreguesHoje: 0, pendentesAntigas: 0 }
  }

  return withTenantContext(claims, async (tx) => {
    const [pendentes, recebidasHoje, entreguesHoje, pendentesAntigas] =
      await Promise.all([
        encomendaRepository.countPendentes(tx, categoria),
        encomendaRepository.countRecebidasHoje(tx, categoria),
        encomendaRepository.countEntreguesHoje(tx, categoria),
        encomendaRepository.countPendentesAntigas(tx, categoria),
      ])

    return { pendentes, recebidasHoje, entreguesHoje, pendentesAntigas }
  })
}

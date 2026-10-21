"use server"

import { randomUUID } from "node:crypto"

import { withTenantContext } from "@/lib/db"
import {
  encomendaAddItemSchema,
  encomendaCreateSchema,
  encomendaUpdateSchema,
} from "@/schemas/encomenda"
import {
  IDENTIFICACAO_OBRIGATORIA_MENSAGEM,
  mensagemErroIdentificacao,
  temIdentificacao,
} from "@/schemas/identificacao"
import { isCheckViolation, isUniqueViolation } from "@/lib/db-errors"
import {
  isAdminLike,
  type TipoEncomenda,
  type Transportadora,
  type TransportadoraFixa,
} from "@/lib/labels"
import {
  TRANSPORTADORAS_TETO_POR_CONDOMINIO,
  casarTransportadoraFixa,
  normalizarNomeTransportadora,
} from "@/lib/transportadoras"
import {
  ENCOMENDAS_PAGE_SIZE,
  encomendaRepository,
  type EncomendaCategoria,
} from "@/repositories/encomenda-repository"
import { logRepository } from "@/repositories/log-repository"
import { moradorRepository } from "@/repositories/morador-repository"
import { transportadoraRepository } from "@/repositories/transportadora-repository"
import {
  desdeParamSchema,
  encomendaCategoriaParamSchema,
  idParamSchema,
  offsetParamSchema,
  retiradoPorParamSchema,
  searchTermParamSchema,
  transportadoraNomeBrutoParamSchema,
  transportadoraNomeParamSchema,
} from "@/schemas/action-params"
import { getSessionClaims, withSession } from "@/services/auth/session"
import type {
  Encomenda,
  EncomendaComDetalhes,
  TransportadoraCadastrada,
} from "@/types/domain"

// Sem revalidatePath aqui (de proposito): ele fazia o servidor re-renderizar
// layout + pagina a cada acao (dezenas de idas ao banco) so para entregar um
// payload que o cliente nem usa. As telas de encomendas/correspondencia leem
// os dados do TanStack Query, que ja e atualizado pela propria tela (update
// otimista + invalidateQueries no onSuccess) e pelo Realtime (RealtimeSync)
// em todos os dispositivos. Payloads antigos do cache do router (ate 30s, ver
// staleTimes no next.config.ts) nao sobrescrevem o cache mais novo do TanStack
// (ver hooks/use-dados-do-servidor.ts).

export type EncomendaActionResult =
  | { success: true; encomendas: Encomenda[] }
  | { success: false; error: string }

export async function createEncomendaAction(
  input: unknown
): Promise<EncomendaActionResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessão expirada. Faça login novamente." }
  }

  const parsed = encomendaCreateSchema.safeParse(input)

  if (!parsed.success) {
    // Regra fixa (NF ou rastreio por item) vem com mensagem propria.
    return {
      success: false,
      error: mensagemErroIdentificacao(parsed.error) ?? "Preencha os campos obrigatórios.",
    }
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

  return { success: true, encomendas: encomendasCriadas }
}

export async function updateEncomendaAction(
  id: string,
  input: unknown
): Promise<EncomendaActionResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessão expirada. Faça login novamente." }
  }

  if (!idParamSchema.safeParse(id).success) {
    return { success: false, error: "Dados inválidos. Recarregue a página e tente novamente." }
  }

  const parsed = encomendaUpdateSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: "Preencha os campos obrigatórios." }
  }

  const resultado = await withTenantContext(claims, async (tx) => {
    // Edicao: registros legados sem NF/rastreio continuam editaveis, mas quem
    // ja tinha identificacao nao pode ficar sem nenhuma das duas.
    const existente = await encomendaRepository.findBaseById(tx, id)

    if (existente && temIdentificacao(existente) && !temIdentificacao(parsed.data)) {
      return { identificacaoAusente: true as const }
    }

    const atualizada = await encomendaRepository.update(tx, id, {
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

    return { identificacaoAusente: false as const, encomenda: atualizada }
  })

  if (resultado.identificacaoAusente) {
    return { success: false, error: IDENTIFICACAO_OBRIGATORIA_MENSAGEM }
  }

  const { encomenda } = resultado

  if (!encomenda) {
    return {
      success: false,
      error: "Encomenda não encontrada ou já foi entregue.",
    }
  }

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
    return { success: false, error: "Sessão expirada. Faça login novamente." }
  }

  if (!idParamSchema.safeParse(loteId).success) {
    return { success: false, error: "Dados inválidos. Recarregue a página e tente novamente." }
  }

  const parsed = encomendaAddItemSchema.safeParse(input)

  if (!parsed.success) {
    // Regra fixa (NF ou rastreio por item) vem com mensagem propria.
    return {
      success: false,
      error: mensagemErroIdentificacao(parsed.error) ?? "Preencha os campos obrigatórios.",
    }
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
      error: "Lote não encontrado ou já entregue. Não é possível adicionar itens.",
    }
  }

  return { success: true, encomendas: [encomenda] }
}

export type EntregarActionResult = { success: true } | { success: false; error: string }

export async function entregarAction(
  id: string,
  retiradoPor: string
): Promise<EntregarActionResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessão expirada. Faça login novamente." }
  }

  if (!idParamSchema.safeParse(id).success) {
    return { success: false, error: "Dados inválidos. Recarregue a página e tente novamente." }
  }

  if (!retiradoPorParamSchema.safeParse(retiradoPor).success) {
    return {
      success: false,
      error: "Nome de quem retirou inválido (máximo de 120 caracteres).",
    }
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
        descricao: `Entregou ${rows.length} item(ns) para ${morador?.nome ?? "morador"} (${rows[0]!.rua}, ${rows[0]!.numero}). Retirado por ${nomeRetirou}.`,
        entidadeId: rows[0]!.loteId,
      })
    }

    return rows
  })

  if (entregues.length === 0) {
    return { success: false, error: "Encomenda já foi entregue ou não existe." }
  }

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
    return { success: false, error: "Sessão expirada. Faça login novamente." }
  }

  if (!idParamSchema.safeParse(id).success) {
    return { success: false, error: "Dados inválidos. Recarregue a página e tente novamente." }
  }

  if (!retiradoPorParamSchema.safeParse(retiradoPor).success) {
    return {
      success: false,
      error: "Nome de quem retirou inválido (máximo de 120 caracteres).",
    }
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
        descricao: `Entregou 1 item (entrega parcial do lote) para ${morador?.nome ?? "morador"} (${rows[0]!.rua}, ${rows[0]!.numero}). Retirado por ${nomeRetirou}.`,
        entidadeId: rows[0]!.loteId,
      })
    }

    return rows
  })

  if (entregues.length === 0) {
    return { success: false, error: "Item já foi entregue ou não existe." }
  }

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
    return { success: false, error: "Sessão expirada. Faça login novamente." }
  }

  if (!idParamSchema.safeParse(id).success) {
    return { success: false, error: "Dados inválidos. Recarregue a página e tente novamente." }
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
    return { success: false, error: "Encomenda já está pendente ou não existe." }
  }

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
    return { success: false, error: "Sessão expirada. Faça login novamente." }
  }

  if (!isAdminLike(claims.app_role)) {
    return {
      success: false,
      error: "Apenas administração ou desenvolvedor podem sinalizar a portaria.",
    }
  }

  if (!idParamSchema.safeParse(loteId).success || typeof ativo !== "boolean") {
    return { success: false, error: "Dados inválidos. Recarregue a página e tente novamente." }
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
    return { success: false, error: "Lote não encontrado ou já foi entregue." }
  }

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
    return { success: false, error: "Sessão expirada. Faça login novamente." }
  }

  if (!isAdminLike(claims.app_role)) {
    return { success: false, error: "Apenas administradores podem excluir encomendas." }
  }

  if (!idParamSchema.safeParse(id).success) {
    return { success: false, error: "Dados inválidos. Recarregue a página e tente novamente." }
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
      error: "Encomenda não encontrada ou ainda pendente (só entregues podem ser excluídas).",
    }
  }

  return { success: true }
}

// Leituras abaixo: a sessao e os dados vao na MESMA transacao (withSession),
// e os parametros sao validados antes de qualquer ida ao banco.

export async function listPendentesAction(
  categoria: EncomendaCategoria = "encomenda"
): Promise<EncomendaComDetalhes[]> {
  if (!encomendaCategoriaParamSchema.safeParse(categoria).success) return []

  const session = await withSession((tx) => encomendaRepository.listPendentes(tx, categoria))

  return session?.dados ?? []
}

export async function listEntreguesAction(
  categoria: EncomendaCategoria = "encomenda",
  offset = 0
): Promise<EncomendaComDetalhes[]> {
  if (
    !encomendaCategoriaParamSchema.safeParse(categoria).success ||
    !offsetParamSchema.safeParse(offset).success
  ) {
    return []
  }

  const session = await withSession((tx) =>
    encomendaRepository.listEntregues(tx, ENCOMENDAS_PAGE_SIZE, categoria, offset)
  )

  return session?.dados ?? []
}

export async function searchEncomendasAction(
  term: string,
  categoria: EncomendaCategoria = "encomenda",
  offset = 0,
  desde?: Date
): Promise<EncomendaComDetalhes[]> {
  if (
    !searchTermParamSchema.safeParse(term).success ||
    !encomendaCategoriaParamSchema.safeParse(categoria).success ||
    !offsetParamSchema.safeParse(offset).success ||
    !desdeParamSchema.safeParse(desde).success
  ) {
    return []
  }

  const session = await withSession((tx) =>
    encomendaRepository.search(tx, term, ENCOMENDAS_PAGE_SIZE, categoria, offset, desde)
  )

  return session?.dados ?? []
}

export type CardsStats = {
  pendentes: number
  recebidasHoje: number
  entreguesHoje: number
  pendentesAntigas: number
}

const CARDS_STATS_VAZIO: CardsStats = {
  pendentes: 0,
  recebidasHoje: 0,
  entreguesHoje: 0,
  pendentesAntigas: 0,
}

export async function getCardsStatsAction(
  categoria: EncomendaCategoria = "encomenda"
): Promise<CardsStats> {
  if (!encomendaCategoriaParamSchema.safeParse(categoria).success) {
    return CARDS_STATS_VAZIO
  }

  const session = await withSession((tx) => encomendaRepository.cardsStats(tx, categoria))

  return session?.dados ?? CARDS_STATS_VAZIO
}

/** Catálogo de transportadoras personalizadas do condomínio (qualquer papel). */
export async function listTransportadorasAction(): Promise<TransportadoraCadastrada[]> {
  const claims = await getSessionClaims()

  if (!claims) return []

  return withTenantContext(claims, (tx) => transportadoraRepository.list(tx))
}

export type CreateTransportadoraResult =
  /** O nome digitado é uma das fixas (ex.: "correios ") — usa o valor do enum. */
  | { success: true; tipo: "fixa"; valor: TransportadoraFixa }
  /** Cadastrada agora ou já existente no catálogo (comparação case-insensitive). */
  | { success: true; tipo: "cadastrada"; transportadora: TransportadoraCadastrada }
  | { success: false; error: string }

/**
 * Cadastra um nome no catálogo de transportadoras do condomínio. Qualquer
 * papel pode cadastrar (mesmo modelo de remetentes). Idempotente: nome já
 * existente devolve o registro atual em vez de erro.
 */
export async function createTransportadoraAction(
  nome: string
): Promise<CreateTransportadoraResult> {
  const claims = await getSessionClaims()

  if (!claims) {
    return { success: false, error: "Sessão expirada. Faça login novamente." }
  }

  if (!transportadoraNomeBrutoParamSchema.safeParse(nome).success) {
    return { success: false, error: "Nome da transportadora inválido." }
  }

  const normalizado = normalizarNomeTransportadora(nome)
  const validado = transportadoraNomeParamSchema.safeParse(normalizado)

  if (!validado.success) {
    return {
      success: false,
      error: validado.error.issues[0]?.message ?? "Nome da transportadora inválido.",
    }
  }

  const fixa = casarTransportadoraFixa(normalizado)

  if (fixa === "outros") {
    return {
      success: false,
      error: "Digite o nome da transportadora (por exemplo, J&T ou Shein).",
    }
  }

  if (fixa) {
    return { success: true, tipo: "fixa", valor: fixa }
  }

  try {
    const resultado = await withTenantContext(claims, async (tx) => {
      const existente = await transportadoraRepository.findByNome(
        tx,
        claims.condominio_id,
        normalizado
      )

      if (existente) {
        return { tetoAtingido: false as const, transportadora: existente }
      }

      const total = await transportadoraRepository.count(tx, claims.condominio_id)

      if (total >= TRANSPORTADORAS_TETO_POR_CONDOMINIO) {
        return { tetoAtingido: true as const }
      }

      const criada = await transportadoraRepository.create(tx, {
        condominioId: claims.condominio_id,
        nome: normalizado,
      })

      return { tetoAtingido: false as const, transportadora: criada }
    })

    if (resultado.tetoAtingido) {
      return {
        success: false,
        error: `O condomínio já tem ${TRANSPORTADORAS_TETO_POR_CONDOMINIO} transportadoras cadastradas. Escolha uma da lista ou fale com a administração.`,
      }
    }

    return { success: true, tipo: "cadastrada", transportadora: resultado.transportadora }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        success: false,
        error: "Esta transportadora já está cadastrada. Selecione-a na lista.",
      }
    }

    if (isCheckViolation(error)) {
      return {
        success: false,
        error: "Nome da transportadora inválido (de 1 a 60 caracteres).",
      }
    }

    throw error
  }
}

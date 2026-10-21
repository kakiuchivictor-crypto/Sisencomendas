import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  ne,
  or,
  sql,
  ilike,
  type SQL,
} from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import type { Transaction } from "@/lib/db"
import { encomendas, moradores, remetentes, usuarios } from "@/db/schema"
import { TRANSPORTADORA_OPTIONS } from "@/lib/labels"
import type { EncomendaStatus, TipoEncomenda, Transportadora } from "@/types/domain"

export const ENCOMENDAS_PAGE_SIZE = 50

export type NewEncomendaInput = {
  loteId: string
  condominioId: string
  moradorId: string
  rua: string
  numero: string
  /** Encomendas normais: transportadora. Correspondencia (tipo="carta"): remetenteId. */
  transportadora?: Transportadora | null
  transportadoraOutro?: string | null
  remetenteId?: string | null
  tipo: TipoEncomenda
  quantidade: number
  codigoRastreio?: string | null
  notaFiscal?: string | null
  observacoes?: string | null
  recebidaPor: string
}

export type UpdateEncomendaInput = {
  moradorId: string
  rua: string
  numero: string
  transportadora?: Transportadora | null
  transportadoraOutro?: string | null
  remetenteId?: string | null
  tipo: TipoEncomenda
  quantidade: number
  codigoRastreio?: string | null
  notaFiscal?: string | null
  observacoes?: string | null
}

/**
 * "carta" (correspondencia) vive na mesma tabela que as demais encomendas,
 * mas tem seu proprio menu/fluxo — por isso as listagens/contagens de
 * encomendas normais excluem esse tipo, e a Correspondencia so enxerga ele.
 */
export type EncomendaCategoria = "encomenda" | "correspondencia"

function categoriaCondition(categoria: EncomendaCategoria): SQL {
  return categoria === "correspondencia"
    ? eq(encomendas.tipo, "carta")
    : ne(encomendas.tipo, "carta")
}

/**
 * Inicio do dia de "hoje" no horario de Brasilia, nao em UTC — a conexao com
 * o Postgres roda com TimeZone=UTC (padrao do Supabase), e Brasilia e UTC-3,
 * entao um simples `date_trunc('day', now())` vira meia-noite em UTC, que
 * corresponde a 21h em Brasilia: "recebidas/entregues hoje" zerava 3h antes
 * da meia-noite local. O duplo "AT TIME ZONE" converte now() pro horario de
 * parede em Brasilia, trunca pro inicio do dia, e converte de volta pra um
 * instante UTC correto pra comparar com timestamptz.
 */
const inicioDoDiaBrasilia = sql`date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'`

export type ReportFilters = {
  from?: Date
  to?: Date
  transportadora?: Transportadora
  /**
   * Transportadora personalizada: implica transportadora = 'outros' e
   * compara o nome sem diferenciar maiúsculas (tem prioridade sobre
   * `transportadora`).
   */
  transportadoraOutro?: string
  moradorId?: string
  status?: EncomendaStatus
}

function buildReportConditions(filters: ReportFilters): SQL[] {
  const conditions: SQL[] = []

  if (filters.from) {
    conditions.push(gte(encomendas.recebidaEm, filters.from))
  }
  if (filters.to) {
    conditions.push(lt(encomendas.recebidaEm, filters.to))
  }
  if (filters.transportadoraOutro) {
    conditions.push(
      eq(encomendas.transportadora, "outros"),
      sql`lower(btrim(${encomendas.transportadoraOutro})) = lower(${filters.transportadoraOutro})`
    )
  } else if (filters.transportadora) {
    conditions.push(eq(encomendas.transportadora, filters.transportadora))
  }
  if (filters.moradorId) {
    conditions.push(eq(encomendas.moradorId, filters.moradorId))
  }
  if (filters.status) {
    conditions.push(eq(encomendas.status, filters.status))
  }

  return conditions
}

const recebidaPorUsuario = alias(usuarios, "recebida_por_usuario")
const entreguePorUsuario = alias(usuarios, "entregue_por_usuario")
const deixadoPortariaUsuario = alias(usuarios, "deixado_portaria_usuario")

const detalhesSelection = {
  id: encomendas.id,
  loteId: encomendas.loteId,
  moradorId: encomendas.moradorId,
  moradorNome: moradores.nome,
  rua: encomendas.rua,
  numero: encomendas.numero,
  transportadora: encomendas.transportadora,
  transportadoraOutro: encomendas.transportadoraOutro,
  remetenteId: encomendas.remetenteId,
  remetenteNome: remetentes.nome,
  tipo: encomendas.tipo,
  quantidade: encomendas.quantidade,
  codigoRastreio: encomendas.codigoRastreio,
  notaFiscal: encomendas.notaFiscal,
  observacoes: encomendas.observacoes,
  status: encomendas.status,
  recebidaPorNome: recebidaPorUsuario.nome,
  recebidaEm: encomendas.recebidaEm,
  entreguePorNome: entreguePorUsuario.nome,
  entregueEm: encomendas.entregueEm,
  retiradoPor: encomendas.retiradoPor,
  deixadoPortariaPor: encomendas.deixadoPortariaPor,
  deixadoPortariaNome: deixadoPortariaUsuario.nome,
  deixadoPortariaEm: encomendas.deixadoPortariaEm,
}

function detalhesQuery(tx: Transaction) {
  return tx
    .select(detalhesSelection)
    .from(encomendas)
    .innerJoin(moradores, eq(encomendas.moradorId, moradores.id))
    .innerJoin(
      recebidaPorUsuario,
      eq(encomendas.recebidaPor, recebidaPorUsuario.id)
    )
    .leftJoin(
      entreguePorUsuario,
      eq(encomendas.entreguePor, entreguePorUsuario.id)
    )
    .leftJoin(remetentes, eq(encomendas.remetenteId, remetentes.id))
    .leftJoin(
      deixadoPortariaUsuario,
      eq(encomendas.deixadoPortariaPor, deixadoPortariaUsuario.id)
    )
}

export const encomendaRepository = {
  async create(tx: Transaction, data: NewEncomendaInput) {
    const [encomenda] = await tx.insert(encomendas).values(data).returning()

    if (!encomenda) {
      throw new Error("Falha ao registrar encomenda")
    }

    return encomenda
  },

  async findBaseById(tx: Transaction, id: string) {
    const [encomenda] = await tx
      .select()
      .from(encomendas)
      .where(eq(encomendas.id, id))
      .limit(1)

    return encomenda ?? null
  },

  /** Usado por "adicionar item" pra herdar morador/rua/numero/status de um lote ja existente. */
  async findOneByLoteId(tx: Transaction, loteId: string) {
    const [encomenda] = await tx
      .select()
      .from(encomendas)
      .where(eq(encomendas.loteId, loteId))
      .limit(1)

    return encomenda ?? null
  },

  async update(tx: Transaction, id: string, data: UpdateEncomendaInput) {
    const [encomenda] = await tx
      .update(encomendas)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(encomendas.id, id), eq(encomendas.status, "pendente")))
      .returning()

    return encomenda ?? null
  },

  /**
   * Entrega o lote inteiro do item informado de uma vez (todos os itens
   * cadastrados juntos na mesma submissao, ex: 1 caixa + 1 pacote), nao so
   * a linha de `id` — evita ter que dar baixa item por item quando varios
   * foram lancados juntos para o mesmo morador/transportadora.
   */
  async entregar(tx: Transaction, id: string, entreguePor: string, retiradoPor: string) {
    return tx
      .update(encomendas)
      .set({
        status: "entregue",
        entreguePor,
        entregueEm: new Date(),
        retiradoPor,
        updatedAt: new Date(),
      })
      .where(
        and(
          sql`${encomendas.loteId} = (select lote_id from sisencomendas.encomendas where id = ${id})`,
          eq(encomendas.status, "pendente")
        )
      )
      .returning()
  },

  /**
   * Entrega so o item informado, sem cascatear pro resto do lote — usado
   * quando o lote tem varios itens mas so um foi retirado (ex: morador
   * pegou a caixa e deixou o envelope pendente ainda).
   */
  async entregarItem(tx: Transaction, id: string, entreguePor: string, retiradoPor: string) {
    return tx
      .update(encomendas)
      .set({
        status: "entregue",
        entreguePor,
        entregueEm: new Date(),
        retiradoPor,
        updatedAt: new Date(),
      })
      .where(and(eq(encomendas.id, id), eq(encomendas.status, "pendente")))
      .returning()
  },

  /** Desfaz a entrega do lote inteiro, registrada por engano, voltando todos os itens para pendente. */
  async voltarParaPendente(tx: Transaction, id: string) {
    return tx
      .update(encomendas)
      .set({
        status: "pendente",
        entreguePor: null,
        entregueEm: null,
        retiradoPor: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          sql`${encomendas.loteId} = (select lote_id from sisencomendas.encomendas where id = ${id})`,
          eq(encomendas.status, "entregue")
        )
      )
      .returning()
  },

  /**
   * Marca/desmarca o lote inteiro como "deixado na portaria pela
   * administracao" — sinalizacao manual (nao um status de entrega) usada
   * quando a administracao retira a encomenda do fluxo normal do porteiro e
   * a deixa fisicamente na portaria. So aplica em lotes pendentes; ativar
   * de novo depois de desativado atualiza quem/quando por cima do valor
   * anterior.
   */
  async setDeixadoPortaria(
    tx: Transaction,
    loteId: string,
    usuarioId: string | null
  ) {
    return tx
      .update(encomendas)
      .set({
        deixadoPortariaPor: usuarioId,
        deixadoPortariaEm: usuarioId ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(encomendas.loteId, loteId), eq(encomendas.status, "pendente")))
      .returning()
  },

  /**
   * Exclui o lote inteiro do item informado — so funciona para lotes ja
   * entregues (a RLS "encomendas_delete_desenvolvedor" bloqueia excluir
   * pendentes, e so libera para o role "desenvolvedor"). Pensado para
   * limpar testes/lancamentos errados, nao para uso rotineiro.
   */
  async removeLote(tx: Transaction, id: string) {
    return tx
      .delete(encomendas)
      .where(
        sql`${encomendas.loteId} = (select lote_id from sisencomendas.encomendas where id = ${id})`
      )
      .returning()
  },

  async listPendentes(tx: Transaction, categoria: EncomendaCategoria = "encomenda") {
    return detalhesQuery(tx)
      .where(and(eq(encomendas.status, "pendente"), categoriaCondition(categoria)))
      .orderBy(asc(encomendas.recebidaEm))
  },

  async listEntregues(
    tx: Transaction,
    limit = ENCOMENDAS_PAGE_SIZE,
    categoria: EncomendaCategoria = "encomenda",
    offset = 0
  ) {
    return detalhesQuery(tx)
      .where(and(eq(encomendas.status, "entregue"), categoriaCondition(categoria)))
      .orderBy(desc(encomendas.entregueEm))
      .limit(limit)
      .offset(offset)
  },

  async search(
    tx: Transaction,
    term: string,
    limit = ENCOMENDAS_PAGE_SIZE,
    categoria: EncomendaCategoria = "encomenda",
    offset = 0,
    /** Atalhos de periodo (hoje/semana/mes) do Historico — filtra recebida_em a partir desta data. */
    desde?: Date
  ) {
    const trimmed = term.trim()
    const desdeCondition = desde ? gte(encomendas.recebidaEm, desde) : undefined

    if (!trimmed) {
      return detalhesQuery(tx)
        .where(and(categoriaCondition(categoria), desdeCondition))
        .orderBy(desc(encomendas.recebidaEm))
        .limit(limit)
        .offset(offset)
    }

    const pattern = `%${trimmed}%`
    const matchingTransportadoras = TRANSPORTADORA_OPTIONS.filter((option) =>
      option.label.toLowerCase().includes(trimmed.toLowerCase())
    ).map((option) => option.value)

    const conditions = [
      ilike(moradores.nome, pattern),
      ilike(encomendas.rua, pattern),
      ilike(encomendas.numero, pattern),
      ilike(encomendas.codigoRastreio, pattern),
      ilike(encomendas.notaFiscal, pattern),
      // Transportadoras personalizadas (J&T, Shein...) gravadas como
      // 'outros' + transportadora_outro. Parametrizado pelo drizzle.
      ilike(encomendas.transportadoraOutro, pattern),
    ]

    if (matchingTransportadoras.length > 0) {
      conditions.push(inArray(encomendas.transportadora, matchingTransportadoras))
    }

    return detalhesQuery(tx)
      .where(and(or(...conditions), categoriaCondition(categoria), desdeCondition))
      .orderBy(desc(encomendas.recebidaEm))
      .limit(limit)
      .offset(offset)
  },

  async countPendentes(tx: Transaction, categoria: EncomendaCategoria = "encomenda") {
    const [row] = await tx
      .select({ value: count() })
      .from(encomendas)
      .where(and(eq(encomendas.status, "pendente"), categoriaCondition(categoria)))

    return row?.value ?? 0
  },

  async countRecebidasHoje(
    tx: Transaction,
    categoria: EncomendaCategoria = "encomenda"
  ) {
    const [row] = await tx
      .select({ value: count() })
      .from(encomendas)
      .where(
        and(
          gte(encomendas.recebidaEm, inicioDoDiaBrasilia),
          categoriaCondition(categoria)
        )
      )

    return row?.value ?? 0
  },

  async countEntreguesHoje(
    tx: Transaction,
    categoria: EncomendaCategoria = "encomenda"
  ) {
    const [row] = await tx
      .select({ value: count() })
      .from(encomendas)
      .where(
        and(
          eq(encomendas.status, "entregue"),
          gte(encomendas.entregueEm, inicioDoDiaBrasilia),
          categoriaCondition(categoria)
        )
      )

    return row?.value ?? 0
  },

  async countPendentesAntigas(
    tx: Transaction,
    categoria: EncomendaCategoria = "encomenda"
  ) {
    const [row] = await tx
      .select({ value: count() })
      .from(encomendas)
      .where(
        and(
          eq(encomendas.status, "pendente"),
          lt(encomendas.recebidaEm, sql`now() - interval '7 days'`),
          categoriaCondition(categoria)
        )
      )

    return row?.value ?? 0
  },

  async report(tx: Transaction, filters: ReportFilters, limit = 2000) {
    const conditions = [...buildReportConditions(filters), ne(encomendas.tipo, "carta")]

    return detalhesQuery(tx)
      .where(and(...conditions))
      .orderBy(desc(encomendas.recebidaEm))
      .limit(limit)
  },

  /**
   * Totais via COUNT no banco (filter/where), em vez de buscar todas as
   * linhas so pra contar em JS — nao escala junto com o volume historico.
   */
  async reportCounts(
    tx: Transaction,
    filters: ReportFilters
  ): Promise<{ totalPendentes: number; totalEntregues: number }> {
    const conditions = [...buildReportConditions(filters), ne(encomendas.tipo, "carta")]

    const [row] = await tx
      .select({
        pendentes: sql<string>`count(*) filter (where ${encomendas.status} = 'pendente')`,
        entregues: sql<string>`count(*) filter (where ${encomendas.status} = 'entregue')`,
      })
      .from(encomendas)
      .where(and(...conditions))

    return {
      totalPendentes: Number(row?.pendentes ?? 0),
      totalEntregues: Number(row?.entregues ?? 0),
    }
  },

  async averageRetrievalSeconds(
    tx: Transaction,
    filters: ReportFilters
  ): Promise<number | null> {
    const conditions = [
      ...buildReportConditions(filters),
      ne(encomendas.tipo, "carta"),
      isNotNull(encomendas.entregueEm),
    ]

    const [row] = await tx
      .select({
        avgSeconds: sql<string | null>`avg(extract(epoch from (${encomendas.entregueEm} - ${encomendas.recebidaEm})))`,
      })
      .from(encomendas)
      .where(and(...conditions))

    return row?.avgSeconds ? Number(row.avgSeconds) : null
  },
}

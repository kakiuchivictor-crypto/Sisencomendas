import { sql } from "drizzle-orm"
import { check, index, integer, pgPolicy, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { condominios } from "./condominios"
import {
  encomendaStatusEnum,
  tipoEncomendaEnum,
  transportadoraEnum,
} from "./enums"
import { moradores } from "./moradores"
import { sisencomendasSchema } from "./namespace"
import { remetentes } from "./remetentes"
import { usuarios } from "./usuarios"

export const encomendas = sisencomendasSchema.table(
  "encomendas",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    // Agrupa itens cadastrados juntos numa mesma submissao do formulario
    // (ex: 1 caixa + 1 pacote do mesmo morador/transportadora). O default
    // gera um lote de 1 item quando nao informado — cada linha e sempre
    // parte de algum lote, nunca "solta". Entregar/reverter um item entrega/
    // reverte o lote inteiro de uma vez (ver encomendaRepository.entregar).
    loteId: uuid("lote_id")
      .notNull()
      .default(sql`gen_random_uuid()`),
    condominioId: uuid("condominio_id")
      .notNull()
      .references(() => condominios.id, { onDelete: "cascade" }),
    moradorId: uuid("morador_id")
      .notNull()
      .references(() => moradores.id, { onDelete: "restrict" }),
    rua: text("rua").notNull(),
    numero: text("numero").notNull(),
    // Nulo pra "carta" (correspondencia) — essas usam remetente_id em vez
    // disso (lista aberta por condominio, nao um enum fixo de transportadora
    // de e-commerce). Continua obrigatorio pra encomendas normais, mas isso
    // e reforcado no Zod (encomendaItemSchema), nao no banco.
    transportadora: transportadoraEnum("transportadora"),
    transportadoraOutro: text("transportadora_outro"),
    // So usado quando tipo = 'carta' — remetente da correspondencia (cartorio,
    // IP Urgente, DHL etc.), escolhido de uma lista que cresce por condominio
    // (ver schema/remetentes.ts) em vez do enum fixo de transportadora.
    remetenteId: uuid("remetente_id").references(() => remetentes.id, {
      onDelete: "set null",
    }),
    tipo: tipoEncomendaEnum("tipo").notNull(),
    quantidade: integer("quantidade").notNull().default(1),
    codigoRastreio: text("codigo_rastreio"),
    notaFiscal: text("nota_fiscal"),
    observacoes: text("observacoes"),
    // Nao usada pela aplicacao (fotos ficam no celular do porteiro, nao no
    // sistema). Coluna mantida sem migration de remocao para nao descartar
    // dados antigos; nenhum codigo le/escreve nela.
    fotoUrl: text("foto_url"),
    status: encomendaStatusEnum("status").notNull().default("pendente"),
    recebidaPor: uuid("recebida_por")
      .notNull()
      .references(() => usuarios.id, { onDelete: "restrict" }),
    recebidaEm: timestamp("recebida_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    entreguePor: uuid("entregue_por").references(() => usuarios.id, {
      onDelete: "restrict",
    }),
    entregueEm: timestamp("entregue_em", { withTimezone: true }),
    // Nome de quem retirou fisicamente a encomenda (morador, familiar ou
    // terceiro autorizado) — texto livre, nao referencia "usuarios" porque
    // raramente e alguem com login no sistema. Diferente de entregue_por
    // (o PORTEIRO que deu baixa): aqui e a prova de quem levou o volume,
    // pensado pra resolver disputas tipo "eu nunca recebi minha encomenda".
    // Nula em registros antigos (campo adicionado depois); a action exige
    // preenchimento em toda entrega nova.
    retiradoPor: text("retirado_por"),
    // Marcado por administracao/desenvolvedor quando a propria administracao
    // deixa a encomenda na portaria (fora do fluxo normal do porteiro) —
    // porteiros veem o icone resultante mas nao podem ativa-lo/desativa-lo,
    // so quem tem esse papel (ver isAdminLike). Aplicado ao lote inteiro de
    // uma vez, mesmo padrao de entregar()/voltarParaPendente().
    deixadoPortariaPor: uuid("deixado_portaria_por").references(() => usuarios.id, {
      onDelete: "restrict",
    }),
    deixadoPortariaEm: timestamp("deixado_portaria_em", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("encomendas_condominio_status_idx").on(t.condominioId, t.status),
    index("encomendas_morador_idx").on(t.moradorId),
    index("encomendas_lote_idx").on(t.loteId),
    // Cobrem status + ordenacao usados por listEntregues/listPendentes, sem
    // precisar ordenar fora do indice conforme o historico cresce.
    index("encomendas_condominio_status_entregue_idx").on(
      t.condominioId,
      t.status,
      t.entregueEm
    ),
    index("encomendas_condominio_status_recebida_idx").on(
      t.condominioId,
      t.status,
      t.recebidaEm
    ),
    // Relatorios filtram por condominio + intervalo de recebida_em.
    index("encomendas_condominio_recebida_idx").on(t.condominioId, t.recebidaEm),
    index("encomendas_rua_trgm_idx").using("gin", t.rua.op("gin_trgm_ops")),
    index("encomendas_numero_trgm_idx").using("gin", t.numero.op("gin_trgm_ops")),
    index("encomendas_codigo_rastreio_trgm_idx").using(
      "gin",
      t.codigoRastreio.op("gin_trgm_ops")
    ),
    index("encomendas_nota_fiscal_trgm_idx").using(
      "gin",
      t.notaFiscal.op("gin_trgm_ops")
    ),
    check("encomendas_quantidade_positive", sql`${t.quantidade} >= 1`),
    // Historico permanente por padrao: so desenvolvedor/administracao podem
    // excluir, e so encomendas ja entregues (nunca pendentes) — pensado para
    // limpar testes/lancamentos errados, nao para uso rotineiro. Nome da
    // policy mantido (nao renomeado) so pra evitar o prompt interativo do
    // drizzle-kit generate ao alterar uma policy existente.
    pgPolicy("encomendas_delete_desenvolvedor", {
      for: "delete",
      to: "sisencomendas_app",
      using: sql`condominio_id = sisencomendas.current_condominio_id() and status = 'entregue' and sisencomendas.current_usuario_role() in ('desenvolvedor', 'administracao')`,
    }),
    pgPolicy("encomendas_select_tenant", {
      for: "select",
      to: "sisencomendas_app",
      using: sql`condominio_id = sisencomendas.current_condominio_id()`,
    }),
    pgPolicy("encomendas_insert_tenant", {
      for: "insert",
      to: "sisencomendas_app",
      withCheck: sql`condominio_id = sisencomendas.current_condominio_id()`,
    }),
    pgPolicy("encomendas_update_tenant", {
      for: "update",
      to: "sisencomendas_app",
      using: sql`condominio_id = sisencomendas.current_condominio_id()`,
      withCheck: sql`condominio_id = sisencomendas.current_condominio_id()`,
    }),
  ]
).enableRLS()

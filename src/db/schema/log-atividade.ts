import { sql } from "drizzle-orm"
import { pgPolicy, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { condominios } from "./condominios"
import { logAcaoEnum } from "./enums"
import { sisencomendasSchema } from "./namespace"
import { usuarios } from "./usuarios"

/**
 * Trilha de auditoria: quem fez o que, e quando — visivel so para
 * "desenvolvedor" (ver policy de select). Historico permanente de proposito
 * (sem policy de update/delete, nem para desenvolvedor): um log que pode
 * ser apagado deixa de servir como auditoria confiavel.
 *
 * usuario_nome e descricao sao capturados no momento da acao (nao vem de
 * JOIN) para o registro continuar fazendo sentido mesmo que o usuario ou a
 * entidade afetada sejam editados/excluidos depois.
 */
export const logAtividade = sisencomendasSchema.table(
  "log_atividade",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    condominioId: uuid("condominio_id")
      .notNull()
      .references(() => condominios.id, { onDelete: "cascade" }),
    usuarioId: uuid("usuario_id").references(() => usuarios.id, {
      onDelete: "set null",
    }),
    usuarioNome: text("usuario_nome").notNull(),
    acao: logAcaoEnum("acao").notNull(),
    descricao: text("descricao").notNull(),
    entidadeId: uuid("entidade_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  () => [
    pgPolicy("log_atividade_select_desenvolvedor", {
      for: "select",
      to: "sisencomendas_app",
      using: sql`condominio_id = sisencomendas.current_condominio_id() and sisencomendas.current_usuario_role() = 'desenvolvedor'`,
    }),
    pgPolicy("log_atividade_insert_tenant", {
      for: "insert",
      to: "sisencomendas_app",
      withCheck: sql`condominio_id = sisencomendas.current_condominio_id()`,
    }),
  ]
).enableRLS()

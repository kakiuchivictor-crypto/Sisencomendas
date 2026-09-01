import { sql } from "drizzle-orm"
import { pgPolicy, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"

import { condominios } from "./condominios"
import { sisencomendasSchema } from "./namespace"

/**
 * Lista de remetentes de Correspondencia (cartorio, IP Urgente, DHL etc.) —
 * ao contrario de "transportadora" (enum fixo, pensado pra encomendas de
 * e-commerce), aqui e uma lista aberta por condominio: qualquer usuario pode
 * cadastrar um remetente novo na hora (ver remetentes_insert_tenant), sem
 * precisar de migration.
 */
export const remetentes = sisencomendasSchema.table(
  "remetentes",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    condominioId: uuid("condominio_id")
      .notNull()
      .references(() => condominios.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("remetentes_condominio_nome_idx").on(t.condominioId, t.nome),
    pgPolicy("remetentes_select_tenant", {
      for: "select",
      to: "sisencomendas_app",
      using: sql`condominio_id = sisencomendas.current_condominio_id()`,
    }),
    pgPolicy("remetentes_insert_tenant", {
      for: "insert",
      to: "sisencomendas_app",
      withCheck: sql`condominio_id = sisencomendas.current_condominio_id()`,
    }),
  ]
).enableRLS()

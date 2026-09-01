import { sql } from "drizzle-orm"
import { index, pgPolicy, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { condominios } from "./condominios"
import { sisencomendasSchema } from "./namespace"

export const moradores = sisencomendasSchema.table(
  "moradores",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    condominioId: uuid("condominio_id")
      .notNull()
      .references(() => condominios.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    rua: text("rua").notNull(),
    numero: text("numero").notNull(),
    observacoes: text("observacoes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("moradores_condominio_idx").on(t.condominioId),
    index("moradores_nome_trgm_idx").using("gin", t.nome.op("gin_trgm_ops")),
    index("moradores_rua_trgm_idx").using("gin", t.rua.op("gin_trgm_ops")),
    pgPolicy("moradores_select_tenant", {
      for: "select",
      to: "sisencomendas_app",
      using: sql`condominio_id = sisencomendas.current_condominio_id()`,
    }),
    pgPolicy("moradores_insert_tenant", {
      for: "insert",
      to: "sisencomendas_app",
      withCheck: sql`condominio_id = sisencomendas.current_condominio_id()`,
    }),
    pgPolicy("moradores_update_admin", {
      for: "update",
      to: "sisencomendas_app",
      using: sql`condominio_id = sisencomendas.current_condominio_id() and sisencomendas.current_usuario_role() in ('desenvolvedor', 'administracao')`,
      withCheck: sql`condominio_id = sisencomendas.current_condominio_id() and sisencomendas.current_usuario_role() in ('desenvolvedor', 'administracao')`,
    }),
    pgPolicy("moradores_delete_admin", {
      for: "delete",
      to: "sisencomendas_app",
      using: sql`condominio_id = sisencomendas.current_condominio_id() and sisencomendas.current_usuario_role() in ('desenvolvedor', 'administracao')`,
    }),
  ]
).enableRLS()

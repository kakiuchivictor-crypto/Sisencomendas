import { sql } from "drizzle-orm"
import { pgPolicy, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { temaEnum } from "./enums"
import { sisencomendasSchema } from "./namespace"

export const condominios = sisencomendasSchema.table(
  "condominios",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    nome: text("nome").notNull(),
    logoUrl: text("logo_url"),
    tema: temaEnum("tema").notNull().default("claro"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  () => [
    pgPolicy("condominios_select_own", {
      for: "select",
      to: "sisencomendas_app",
      using: sql`id = sisencomendas.current_condominio_id()`,
    }),
    pgPolicy("condominios_update_admin", {
      for: "update",
      to: "sisencomendas_app",
      using: sql`id = sisencomendas.current_condominio_id() and sisencomendas.current_usuario_role() = 'desenvolvedor'`,
      withCheck: sql`id = sisencomendas.current_condominio_id() and sisencomendas.current_usuario_role() = 'desenvolvedor'`,
    }),
  ]
).enableRLS()

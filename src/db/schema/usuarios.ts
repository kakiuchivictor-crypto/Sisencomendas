import { sql } from "drizzle-orm"
import { index, pgPolicy, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { authUsers } from "./auth"
import { condominios } from "./condominios"
import { usuarioRoleEnum } from "./enums"
import { sisencomendasSchema } from "./namespace"

export const usuarios = sisencomendasSchema.table(
  "usuarios",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    condominioId: uuid("condominio_id")
      .notNull()
      .references(() => condominios.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    // Duplicado de auth.users.email de proposito: o role de runtime nao tem
    // (e nao deve ter) acesso direto a auth.users no Supabase real, entao a
    // tela de usuarios le o email daqui em vez de fazer join com auth.users.
    email: text("email").notNull().unique(),
    role: usuarioRoleEnum("role").notNull().default("porteiro"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("usuarios_condominio_idx").on(t.condominioId),
    pgPolicy("usuarios_select_tenant", {
      for: "select",
      to: "sisencomendas_app",
      using: sql`condominio_id = sisencomendas.current_condominio_id()`,
    }),
    pgPolicy("usuarios_insert_admin", {
      for: "insert",
      to: "sisencomendas_app",
      withCheck: sql`condominio_id = sisencomendas.current_condominio_id() and sisencomendas.current_usuario_role() = 'desenvolvedor'`,
    }),
    pgPolicy("usuarios_update_admin", {
      for: "update",
      to: "sisencomendas_app",
      using: sql`condominio_id = sisencomendas.current_condominio_id() and sisencomendas.current_usuario_role() = 'desenvolvedor'`,
      withCheck: sql`condominio_id = sisencomendas.current_condominio_id() and sisencomendas.current_usuario_role() = 'desenvolvedor'`,
    }),
    pgPolicy("usuarios_delete_admin", {
      for: "delete",
      to: "sisencomendas_app",
      using: sql`condominio_id = sisencomendas.current_condominio_id() and sisencomendas.current_usuario_role() = 'desenvolvedor'`,
    }),
  ]
).enableRLS()

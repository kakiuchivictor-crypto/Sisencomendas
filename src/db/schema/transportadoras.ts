import { sql } from "drizzle-orm"
import {
  check,
  foreignKey,
  pgPolicy,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { condominios } from "./condominios"
import { sisencomendasSchema } from "./namespace"

/**
 * Catálogo de transportadoras "personalizadas" por condomínio (J&T, Shein,
 * Kangu...). Complementa o enum fixo `sisencomendas.transportadora` — por
 * isso o nome no plural (o singular colide com o enum).
 *
 * As encomendas NÃO referenciam esta tabela: continuam gravando
 * transportadora = 'outros' + transportadora_outro = nome. O catálogo só
 * serve para o porteiro não precisar redigitar o nome a cada cadastro.
 *
 * Unicidade case-insensitive via índice em lower(nome); sem policy de
 * UPDATE/DELETE de propósito (mesmo modelo de remetentes).
 */
export const transportadoras = sisencomendasSchema.table(
  "transportadoras",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    condominioId: uuid("condominio_id").notNull(),
    nome: text("nome").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Nome da FK igual ao gerado pelo REFERENCES inline aplicado em produção
    // (supabase/deploy.sql), para o schema local e o de produção baterem.
    foreignKey({
      name: "transportadoras_condominio_id_fkey",
      columns: [t.condominioId],
      foreignColumns: [condominios.id],
    }).onDelete("cascade"),
    // Coluna sem qualificar: o drizzle-kit gera "schema"."tabela"."coluna"
    // quando se usa ${t.nome}, o que não bate com o SQL de produção.
    check(
      "transportadoras_nome_valido",
      sql`nome = btrim(nome) AND char_length(nome) BETWEEN 1 AND 60`
    ),
    uniqueIndex("transportadoras_condominio_nome_idx").on(
      t.condominioId,
      sql`lower(${t.nome})`
    ),
    pgPolicy("transportadoras_select_tenant", {
      for: "select",
      to: "sisencomendas_app",
      using: sql`condominio_id = sisencomendas.current_condominio_id()`,
    }),
    pgPolicy("transportadoras_insert_tenant", {
      for: "insert",
      to: "sisencomendas_app",
      withCheck: sql`condominio_id = sisencomendas.current_condominio_id()`,
    }),
  ]
).enableRLS()

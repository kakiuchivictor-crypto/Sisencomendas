import { sql } from "drizzle-orm"
import { pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core"

/**
 * Shim local do schema "auth" do Supabase. Guarda apenas o essencial
 * (email + hash de senha) para autenticacao. Ao migrar para um projeto
 * Supabase real, esta tabela e substituida pela tabela auth.users gerenciada
 * pelo GoTrue — o restante do schema (usuarios, moradores, encomendas) nao muda,
 * pois so referencia auth.users.id.
 */
export const authSchema = pgSchema("auth")

export const authUsers = authSchema.table("users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

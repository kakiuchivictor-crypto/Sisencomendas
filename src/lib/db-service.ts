import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/db/schema"

const SERVICE_DATABASE_URL = process.env.MIGRATION_DATABASE_URL

if (!SERVICE_DATABASE_URL) {
  throw new Error("MIGRATION_DATABASE_URL nao definida")
}

const globalForDb = globalThis as unknown as {
  pgServiceClient?: postgres.Sql
}

const client =
  globalForDb.pgServiceClient ??
  postgres(SERVICE_DATABASE_URL, { max: 5, prepare: false })

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgServiceClient = client
}

/**
 * Conexao privilegiada (dona das tabelas, ignora RLS) — equivalente ao papel
 * que o `service_role`/GoTrue tem no Supabase real. USE APENAS para:
 *  - autenticacao (localizar o usuario pelo email antes de existir uma sessao/JWT)
 *  - scripts de seed/provisionamento
 * Nunca use esta conexao para servir dados de negocio tenant-scoped —
 * para isso, sempre `withTenantContext` em `@/lib/db`.
 */
export const dbService = drizzle(client, { schema })

/** Cliente postgres cru, exposto so para scripts CLI encerrarem a conexao (ex: seed.ts). */
export const dbServiceClient = client

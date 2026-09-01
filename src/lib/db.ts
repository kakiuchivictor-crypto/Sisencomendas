import { sql } from "drizzle-orm"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/db/schema"
import type { UsuarioRole } from "@/lib/labels"

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL nao definida")
}

const globalForDb = globalThis as unknown as {
  pgClient?: postgres.Sql
}

// max baixo de proposito: em serverless (Vercel), cada instancia da funcao
// abre seu proprio pool — um "max" alto por instancia multiplica rapido sob
// varias instancias simultaneas e pode esgotar o limite de conexoes do
// Supabase. DATABASE_URL deve apontar pra porta 6543 (Supavisor em
// transaction mode), que e feito pra multiplexar exatamente esse cenario;
// prepare:false ja e exigido por esse modo (sem prepared statements).
const client =
  globalForDb.pgClient ?? postgres(DATABASE_URL, { max: 5, prepare: false })

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client
}

export const db = drizzle(client, { schema })

export type TenantClaims = {
  /** id do usuario (auth.users.id / usuarios.id) */
  sub: string
  /** mesmo significado do claim "role" do Supabase Auth */
  role: "authenticated"
  /** RBAC especifico deste app */
  app_role: UsuarioRole
  condominio_id: string
  /** Nome do usuario logado — carregado aqui pra evitar re-consultar "usuarios"
   * so pra pegar o nome em cada acao que grava no log de atividade. */
  nome: string
}

export type Transaction = Parameters<
  Parameters<PostgresJsDatabase<typeof schema>["transaction"]>[0]
>[0]

/**
 * Identidade confiavel minima exigida por withTenantContext — so sub/role,
 * vindos direto do Supabase Auth (supabase.auth.getUser(), que valida contra
 * o servidor). E o unico subconjunto de TenantClaims que a GUC realmente usa,
 * o que permite chamar withTenantContext mesmo antes de sabermos app_role/
 * condominio_id (ex: dentro do proprio getSessionClaims, para descobri-los).
 */
export type AuthIdentity = Pick<TenantClaims, "sub" | "role">

/**
 * Abre uma transacao e injeta APENAS a identidade confiavel (sub) na GUC
 * "request.jwt.claims" — mesmo mecanismo usado pelo PostgREST/Supabase em
 * producao. As RLS policies nao leem app_role/condominio_id daqui: elas
 * chamam sisencomendas.current_condominio_id()/current_usuario_role(), que
 * consultam a tabela usuarios ao vivo a partir de auth.uid() (SECURITY
 * DEFINER). Isso evita o problema de claims desatualizadas — se o role ou
 * condominio de um usuario mudar, a mudanca vale na proxima query, sem
 * esperar o JWT expirar ou o usuario logar de novo. Os campos app_role/
 * condominio_id ainda existem em TenantClaims (vindos da sessao, resolvidos
 * uma vez por getSessionClaims) apenas para uso de UI no app Next.js; nunca
 * sao a fonte de autorizacao. Toda query tenant-aware deve passar por aqui;
 * nunca usar `db` diretamente para dados de negocio.
 */
export async function withTenantContext<T>(
  identity: AuthIdentity,
  callback: (tx: Transaction) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    const trustedClaims = { sub: identity.sub, role: identity.role }
    await tx.execute(
      sql`select set_config('request.jwt.claims', ${JSON.stringify(trustedClaims)}, true)`
    )
    return callback(tx)
  })
}

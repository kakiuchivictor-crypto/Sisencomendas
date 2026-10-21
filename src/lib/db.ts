import { sql } from "drizzle-orm"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/db/schema"
import type { UsuarioRole } from "@/lib/labels"

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL não definida")
}

const globalForDb = globalThis as unknown as {
  pgClient?: postgres.Sql
}

/**
 * TLS obrigatorio fora de localhost. O postgres.js NAO liga TLS sozinho (o
 * padrao e ssl:false) e a DATABASE_URL nao traz sslmode: sem isto a conexao
 * com o Supavisor trafegava sem criptografia (senha do role e dados).
 * "require" = criptografa sem validar a cadeia do certificado (mesmo
 * comportamento do sslmode=require do libpq). Validar o certificado
 * (verify-full) exigiria embarcar a CA do Supabase; fica como evolucao.
 * Um Postgres local de desenvolvimento (localhost/127.0.0.1) segue sem TLS.
 */
const isLocalDatabase = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL)

// max baixo de proposito: em serverless (Vercel), cada instancia da funcao
// abre seu proprio pool — um "max" alto por instancia multiplica rapido sob
// varias instancias simultaneas e pode esgotar o limite de conexoes do
// Supabase. DATABASE_URL deve apontar pra porta 6543 (Supavisor em
// transaction mode), que e feito pra multiplexar exatamente esse cenario;
// prepare:false ja e exigido por esse modo (sem prepared statements).
// fetch_types:false: o schema nao usa colunas array (unico motivo para o
// postgres.js consultar pg_type), e essa consulta custava uma ida a mais ao
// banco a cada conexao nova (em serverless, quase toda requisicao fria).
const client =
  globalForDb.pgClient ??
  postgres(DATABASE_URL, {
    max: 5,
    prepare: false,
    fetch_types: false,
    ssl: isLocalDatabase ? false : "require",
  })

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
 * vindos do JWT do Supabase Auth ja verificado (supabase.auth.getClaims(),
 * ver services/auth/session.ts). E o unico subconjunto de TenantClaims que a
 * GUC realmente usa, o que permite chamar withTenantContext mesmo antes de
 * sabermos app_role/condominio_id (ex: dentro do proprio getSessionClaims,
 * para descobri-los).
 */
export type AuthIdentity = Pick<TenantClaims, "sub" | "role">

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}

/**
 * Monta o literal SQL (entre aspas simples) do JSON de claims. O valor vai
 * interpolado no texto da consulta (e nao como parametro $1) para a consulta
 * nao ter parametros: com prepare:false, o postgres.js faz uma ida extra ao
 * banco (Parse/Describe + espera) para TODA consulta com parametro, e ainda
 * trava o pipeline da conexao ate essa resposta voltar.
 *
 * Seguranca da interpolacao (sem injecao):
 *  - `sub` precisa casar com a regex de UUID (so [0-9a-f-]), senao lanca erro;
 *  - `role` precisa ser exatamente "authenticated";
 *  - o JSON e gerado por JSON.stringify (nunca concatenado a mao);
 *  - aspas simples sao dobradas ('' ) por garantia, embora um JSON com esses
 *    dois campos validados nunca contenha aspas simples nem barras invertidas
 *    (standard_conforming_strings=on, padrao do Postgres, trata "\" como
 *    caractere comum dentro de '...').
 */
function claimsSqlLiteral(identity: AuthIdentity): string {
  if (!isUuid(identity.sub)) {
    throw new Error("Identidade inválida: sub não é um UUID.")
  }
  if (identity.role !== "authenticated") {
    throw new Error("Identidade inválida: role inesperado.")
  }

  const json = JSON.stringify({ sub: identity.sub.toLowerCase(), role: identity.role })
  return `'${json.replace(/'/g, "''")}'`
}

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
 *
 * Idas ao banco: BEGIN (1) + [set_config + consultas do callback, na mesma
 * leva] (1 se as consultas nao tiverem parametros) + COMMIT (1). Antes eram
 * BEGIN (1) + set_config com parametro (2) + 2 por consulta com parametro,
 * todas em fila + COMMIT (1).
 *
 * Por que o set_config nao e aguardado antes do callback: ele e disparado
 * primeiro, de forma sincrona, e o postgres.js envia as consultas de uma
 * transacao na ordem em que sao disparadas, pela mesma conexao (uma fila
 * FIFO; o Postgres executa na ordem recebida). Como o set_config nao tem
 * parametros, o postgres.js nao trava a fila esperando o Describe dele, e as
 * consultas do callback seguem no mesmo pacote. Garantias mantidas:
 *  - GUC por transacao (set_config(..., true) = is_local): nunca vaza para
 *    outra requisicao que reutilize a conexao do pool/Supavisor;
 *  - se o set_config falhar, a transacao fica abortada, TODAS as consultas
 *    seguintes falham e o postgres.js faz ROLLBACK (o erro e propagado);
 *  - se o callback lancar erro, ROLLBACK e conexao devolvida ao pool
 *    (comportamento padrao do sql.begin do postgres.js);
 *  - mesmo num cenario hipotetico de reordenacao, a falha seria "fechada":
 *    sem a GUC, auth.uid() e nulo e a RLS nao devolve/aceita linha nenhuma.
 *
 * DEPENDENCIA DE VERSAO: essa ordem (set_config enviado antes das consultas
 * do callback, sem await) depende do comportamento interno do drizzle-orm
 * (tx.execute(...).execute() dispara na hora) e da fila FIFO do postgres.js
 * por conexao. Por isso as versoes estao FIXADAS sem "^" no package.json
 * ("drizzle-orm": "0.45.2", "postgres": "3.4.9"). Antes de atualizar
 * qualquer uma das duas, rode o teste que confere o sub como PRIMEIRA
 * consulta e em Promise.all (teste-ordem-set-config.ts, guardado fora do
 * repositorio no scratchpad da revisao de seguranca; recriar se preciso).
 */
export async function withTenantContext<T>(
  identity: AuthIdentity,
  callback: (tx: Transaction) => Promise<T>
): Promise<T> {
  // Valida antes de abrir a transacao (lanca erro se a identidade for invalida).
  const claimsLiteral = claimsSqlLiteral(identity)

  return db.transaction(async (tx) => {
    // .execute() dispara a consulta AGORA e devolve uma Promise comum (o
    // objeto de tx.execute() e preguicoso: cada .then() executaria de novo).
    const definirClaims = tx
      .execute(sql.raw(`select set_config('request.jwt.claims', ${claimsLiteral}, true)`))
      .execute()
    // Evita "unhandled rejection" se o callback falhar antes do await abaixo;
    // o erro em si continua sendo propagado pelo await.
    definirClaims.catch(() => {})

    const result = await callback(tx)
    await definirClaims
    return result
  })
}

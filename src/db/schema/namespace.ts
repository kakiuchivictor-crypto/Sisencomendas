import { pgSchema } from "drizzle-orm/pg-core"

/**
 * Todo objeto de negocio do app (enums, tabelas, funcoes) vive neste schema
 * dedicado, nunca em "public". Isso permite rodar este banco dentro do
 * mesmo projeto Supabase de outro app (ex: um sistema de psicologos) sem
 * risco de colisao de nomes de tabela — os dois apps ficam completamente
 * isolados por schema, mesmo compartilhando a mesma instancia Postgres.
 *
 * O schema "auth" continua existindo separadamente: localmente e o nosso
 * shim (ver auth.ts); em um Supabase real, "auth" ja pertence ao Supabase
 * (GoTrue) e nunca deve ser recriado ou alterado por este projeto.
 */
export const sisencomendasSchema = pgSchema("sisencomendas")

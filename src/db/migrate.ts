import { config } from "dotenv"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

config({ path: ".env.local" })

const migrationUrl = process.env.MIGRATION_DATABASE_URL

if (!migrationUrl) {
  throw new Error("MIGRATION_DATABASE_URL nao definida em .env.local")
}

async function main() {
  const sql = postgres(migrationUrl as string, { max: 1 })
  const db = drizzle(sql)

  console.log("Aplicando migrations...")
  await migrate(db, { migrationsFolder: "./src/db/migrations" })
  console.log("Migrations aplicadas com sucesso.")

  await sql.end()
}

main().catch((error: unknown) => {
  console.error("Falha ao aplicar migrations:", error)
  process.exit(1)
})

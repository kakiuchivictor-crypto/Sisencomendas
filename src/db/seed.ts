import { config } from "dotenv"
import { hash } from "bcryptjs"

config({ path: ".env.local" })

async function main() {
  const { dbService, dbServiceClient } = await import("@/lib/db-service")
  const { authUsers, condominios, usuarios } = await import("@/db/schema")

  const condominioNome = "Condominio Exemplo"
  const adminEmail = "admin@exemplo.com"
  const porteiroEmail = "porteiro@exemplo.com"
  const senha = "trocar123"

  const [condominio] = await dbService
    .insert(condominios)
    .values({ nome: condominioNome })
    .returning()

  if (!condominio) {
    throw new Error("Falha ao criar condominio de teste")
  }

  const passwordHash = await hash(senha, 12)

  const [adminAuthUser] = await dbService
    .insert(authUsers)
    .values({ email: adminEmail, passwordHash })
    .returning()

  const [porteiroAuthUser] = await dbService
    .insert(authUsers)
    .values({ email: porteiroEmail, passwordHash })
    .returning()

  if (!adminAuthUser || !porteiroAuthUser) {
    throw new Error("Falha ao criar usuarios de autenticacao de teste")
  }

  await dbService.insert(usuarios).values([
    {
      id: adminAuthUser.id,
      condominioId: condominio.id,
      nome: "Admin de Teste",
      email: adminEmail,
      role: "desenvolvedor",
    },
    {
      id: porteiroAuthUser.id,
      condominioId: condominio.id,
      nome: "Porteiro de Teste",
      email: porteiroEmail,
      role: "porteiro",
    },
  ])

  console.log("Seed concluido (so no Postgres local — o login do app agora")
  console.log("passa pelo Supabase Auth real, esses usuarios nao logam nele):")
  console.log(`  Condominio: ${condominioNome}`)
  console.log(`  Admin:      ${adminEmail} / ${senha}`)
  console.log(`  Porteiro:   ${porteiroEmail} / ${senha}`)

  await dbServiceClient.end()
}

main().catch((error: unknown) => {
  console.error("Falha ao rodar seed:", error)
  process.exit(1)
})

import { redirect } from "next/navigation"

import { AppHeader } from "@/components/layout/app-header"
import { ApplyCondominioTheme } from "@/components/layout/apply-condominio-theme"
import { RealtimeSync } from "@/components/layout/realtime-sync"
import { withTenantContext } from "@/lib/db"
import { isAdminLike } from "@/lib/labels"
import { condominioRepository } from "@/repositories/condominio-repository"
import { usuarioRepository } from "@/repositories/usuario-repository"
import { getSessionClaims } from "@/services/auth/session"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const claims = await getSessionClaims()

  if (!claims) {
    redirect("/login")
  }

  const { condominio, usuario } = await withTenantContext(claims, async (tx) => {
    const [condominio, usuario] = await Promise.all([
      condominioRepository.findById(tx, claims.condominio_id),
      usuarioRepository.findById(tx, claims.sub),
    ])

    return { condominio, usuario }
  })

  if (!condominio || !usuario) {
    redirect("/login")
  }

  const navItems = [
    { href: "/", label: "Pendentes" },
    { href: "/entregues", label: "Entregues" },
    { href: "/historico", label: "Historico" },
    { href: "/correspondencia", label: "Correspondencia" },
    { href: "/moradores", label: "Moradores" },
  ]

  const adminMenuItems = [
    ...(isAdminLike(usuario.role) ? [{ href: "/relatorios", label: "Relatorios" }] : []),
    ...(usuario.role === "desenvolvedor"
      ? [
          { href: "/atividade", label: "Atividade" },
          { href: "/usuarios", label: "Usuarios" },
          { href: "/configuracoes", label: "Configuracoes" },
        ]
      : []),
  ]

  return (
    <div className="min-h-screen">
      <ApplyCondominioTheme tema={condominio.tema} />
      <RealtimeSync condominioId={condominio.id} />
      <AppHeader
        condominioNome={condominio.nome}
        usuarioNome={usuario.nome}
        usuarioRole={usuario.role}
        navItems={navItems}
        adminMenuItems={adminMenuItems}
      />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}

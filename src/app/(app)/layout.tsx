import { redirect } from "next/navigation"

import { AppHeader } from "@/components/layout/app-header"
import { ApplyCondominioTheme } from "@/components/layout/apply-condominio-theme"
import { BottomNav } from "@/components/layout/bottom-nav"
import type { NavItem } from "@/components/layout/nav-types"
import { RealtimeSync } from "@/components/layout/realtime-sync"
import { withTenantContext } from "@/lib/db"
import { isAdminLike } from "@/lib/labels"
import { condominioRepository } from "@/repositories/condominio-repository"
import { encomendaRepository } from "@/repositories/encomenda-repository"
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

  const { condominio, usuario, navCounts } = await withTenantContext(
    claims,
    async (tx) => {
      // Os dois COUNT de pendentes alimentam os contadores das abas (valor
      // inicial; depois o cliente atualiza via Realtime/getNavCountsAction).
      const [condominio, usuario, encomendasPendentes, correspondenciasPendentes] =
        await Promise.all([
          condominioRepository.findById(tx, claims.condominio_id),
          usuarioRepository.findById(tx, claims.sub),
          encomendaRepository.countPendentes(tx, "encomenda"),
          encomendaRepository.countPendentes(tx, "correspondencia"),
        ])

      return {
        condominio,
        usuario,
        navCounts: {
          encomendas: encomendasPendentes,
          correspondencias: correspondenciasPendentes,
        },
      }
    }
  )

  if (!condominio || !usuario) {
    redirect("/login")
  }

  // Relatorios aparece como aba so para administracao/desenvolvedor (mesma
  // regra do redirect em relatorios/page.tsx).
  const relatoriosItem: NavItem[] = isAdminLike(usuario.role)
    ? [{ href: "/relatorios", label: "Relatorios" }]
    : []

  const navItems: NavItem[] = [
    { href: "/", label: "Pendentes", countKey: "encomendas" },
    { href: "/entregues", label: "Entregues" },
    { href: "/historico", label: "Historico" },
    { href: "/correspondencia", label: "Correspondencia", countKey: "correspondencias" },
    { href: "/moradores", label: "Moradores" },
    ...relatoriosItem,
  ]

  // Engrenagem: so o que e exclusivo do perfil desenvolvedor.
  const adminMenuItems = [
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
        navCounts={navCounts}
      />
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:pb-10">{children}</main>
      <BottomNav
        moreItems={[
          { href: "/historico", label: "Historico" },
          ...relatoriosItem,
          ...adminMenuItems,
        ]}
        initialCounts={navCounts}
      />
    </div>
  )
}

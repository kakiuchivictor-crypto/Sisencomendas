import { redirect } from "next/navigation"

import { AppHeader } from "@/components/layout/app-header"
import { ApplyCondominioTheme } from "@/components/layout/apply-condominio-theme"
import { BottomNav } from "@/components/layout/bottom-nav"
import type { NavItem } from "@/components/layout/nav-types"
import { RealtimeSync } from "@/components/layout/realtime-sync"
import { isAdminLike } from "@/lib/labels"
import { encomendaRepository } from "@/repositories/encomenda-repository"
import { withSession } from "@/services/auth/session"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Uma transacao so: perfil + condominio (nome/tema) da sessao e os
  // contadores das abas (valor inicial; depois o cliente atualiza via
  // Realtime/getNavCountsAction). O layout nao e refeito a cada troca de aba
  // (o App Router so renderiza o segmento da pagina), entao isto roda no
  // carregamento inicial e quando algo forca um refresh do layout.
  const session = await withSession((tx) => encomendaRepository.navCounts(tx))

  if (!session) {
    redirect("/login")
  }

  const { claims, condominio, dados: navCounts } = session

  // Relatorios aparece como aba so para administracao/desenvolvedor (mesma
  // regra do redirect em relatorios/page.tsx).
  const relatoriosItem: NavItem[] = isAdminLike(claims.app_role)
    ? [{ href: "/relatorios", label: "Relatórios" }]
    : []

  const navItems: NavItem[] = [
    { href: "/", label: "Pendentes", countKey: "encomendas" },
    { href: "/entregues", label: "Entregues" },
    { href: "/historico", label: "Histórico" },
    { href: "/correspondencia", label: "Correspondência", countKey: "correspondencias" },
    { href: "/moradores", label: "Moradores" },
    ...relatoriosItem,
  ]

  // Engrenagem: so o que e exclusivo do perfil desenvolvedor.
  const adminMenuItems = [
    ...(claims.app_role === "desenvolvedor"
      ? [
          { href: "/atividade", label: "Atividade" },
          { href: "/usuarios", label: "Usuários" },
          { href: "/configuracoes", label: "Configurações" },
        ]
      : []),
  ]

  return (
    <div className="min-h-screen">
      <ApplyCondominioTheme tema={condominio.tema} />
      <RealtimeSync condominioId={condominio.id} />
      <AppHeader
        condominioNome={condominio.nome}
        usuarioNome={claims.nome}
        usuarioRole={claims.app_role}
        navItems={navItems}
        adminMenuItems={adminMenuItems}
        navCounts={navCounts}
      />
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:pb-10">{children}</main>
      <BottomNav
        moreItems={[
          { href: "/historico", label: "Histórico" },
          ...relatoriosItem,
          ...adminMenuItems,
        ]}
        initialCounts={navCounts}
      />
    </div>
  )
}

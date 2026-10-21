import type { NavCounts } from "@/app/(app)/actions"
import { LogixOneMark, LogixOneWordmark } from "@/components/brand/logixone-logo"
import { Badge } from "@/components/ui/badge"
import { AdminMenu } from "@/components/layout/admin-menu"
import { AppNav } from "@/components/layout/app-nav"
import { LogoutButton } from "@/components/layout/logout-button"
import type { NavItem } from "@/components/layout/nav-types"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { USUARIO_ROLE_LABELS } from "@/lib/labels"
import type { UsuarioRole } from "@/types/domain"

/**
 * Header de uma linha. Abaixo de sm mostra so a marca: navegacao, tema,
 * administracao e "Sair" ficam na barra inferior (BottomNav). Entre sm e xl
 * as abas descem para uma segunda faixa; a partir de xl ficam na mesma linha
 * (em lg, ex. iPad deitado, o nome do condominio ficaria espremido).
 */
export function AppHeader({
  condominioNome,
  usuarioNome,
  usuarioRole,
  navItems,
  adminMenuItems,
  navCounts,
}: {
  condominioNome: string
  usuarioNome: string
  usuarioRole: UsuarioRole
  navItems: NavItem[]
  adminMenuItems: { href: string; label: string }[]
  navCounts: NavCounts
}) {
  return (
    <header className="bg-background sticky top-0 z-30 border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* Simbolo LogixOne (o mesmo do login, favicon e PWA). O wordmark so
              aparece quando as abas estao na segunda faixa (sm ate lg): abaixo
              de sm e no xl (abas na mesma linha) ele espremeria o nome do
              condominio e do usuario, que importam mais — ali fica so o
              simbolo, com o nome da marca para leitores de tela. */}
          <span className="flex shrink-0 items-center gap-2.5">
            <LogixOneMark />
            <span className="sr-only">LogixOne</span>
            <span aria-hidden="true" className="hidden sm:inline xl:hidden">
              <LogixOneWordmark className="text-lg" />
            </span>
            <span
              aria-hidden="true"
              className="bg-border hidden h-6 w-px sm:block xl:hidden"
            />
          </span>
          <div className="min-w-0">
            <p className="font-heading truncate text-sm font-semibold tracking-tight">
              {condominioNome}
            </p>
            <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
              <span className="truncate">{usuarioNome}</span>
              <Badge variant="secondary">{USUARIO_ROLE_LABELS[usuarioRole]}</Badge>
            </div>
          </div>
        </div>

        <AppNav
          items={navItems}
          initialCounts={navCounts}
          className="ml-2 hidden self-stretch xl:flex"
        />

        <div className="ml-auto hidden items-center gap-1 sm:flex">
          <AdminMenu items={adminMenuItems} />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>

      {/* Faixa rolavel na horizontal, sem barra visivel (no Windows ela aparecia
          por cima das abas). Aqui os links nao usam -mb-px: o overflow corta o
          que passa da borda, e a faixa nao tem borda propria para sobrepor. */}
      <div className="mx-auto hidden h-11 max-w-6xl overflow-x-auto overflow-y-hidden px-2 [scrollbar-width:none] sm:block xl:hidden [&::-webkit-scrollbar]:hidden">
        <AppNav
          items={navItems}
          initialCounts={navCounts}
          className="h-full w-max"
          linkClassName="mb-0"
        />
      </div>
    </header>
  )
}

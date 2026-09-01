import { Package } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { AdminMenu } from "@/components/layout/admin-menu"
import { AppNav } from "@/components/layout/app-nav"
import { LogoutButton } from "@/components/layout/logout-button"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { USUARIO_ROLE_LABELS } from "@/lib/labels"
import type { UsuarioRole } from "@/types/domain"

export function AppHeader({
  condominioNome,
  usuarioNome,
  usuarioRole,
  navItems,
  adminMenuItems,
}: {
  condominioNome: string
  usuarioNome: string
  usuarioRole: UsuarioRole
  navItems: { href: string; label: string }[]
  adminMenuItems: { href: string; label: string }[]
}) {
  return (
    <header className="bg-background sticky top-0 z-10 border-b">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Package className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="font-heading truncate text-sm font-semibold tracking-tight">
              {condominioNome}
            </p>
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span className="truncate">{usuarioNome}</span>
              <Badge variant="secondary">{USUARIO_ROLE_LABELS[usuarioRole]}</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <AdminMenu items={adminMenuItems} />
          <ThemeToggle />
          <LogoutButton />
        </div>
        <div className="order-3 w-full overflow-x-auto sm:order-none sm:w-auto sm:overflow-visible">
          <AppNav items={navItems} />
        </div>
      </div>
    </header>
  )
}

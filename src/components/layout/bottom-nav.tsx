"use client"

import {
  CheckCircle2,
  Ellipsis,
  LogOut,
  Mail,
  Moon,
  Package,
  Sun,
  Users,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { useTheme } from "next-themes"

import type { NavCounts } from "@/app/(app)/actions"
import { isNavItemActive, type NavItem } from "@/components/layout/nav-types"
import { LinkPendingHint, useAbaOtimista } from "@/components/layout/use-aba-otimista"
import { useLogout } from "@/components/layout/use-logout"
import { useNavCounts } from "@/components/layout/use-nav-counts"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type BottomNavLink = NavItem & { icon: LucideIcon }

// As 4 abas fixas existem para todos os perfis (as paginas nao restringem
// por role); o que depende de permissao vai em "Mais" (moreItems, montado
// no layout com as mesmas regras do header).
const LINKS: BottomNavLink[] = [
  { href: "/", label: "Pendentes", icon: Package, countKey: "encomendas" },
  { href: "/entregues", label: "Entregues", icon: CheckCircle2 },
  { href: "/correspondencia", label: "Cartas", icon: Mail, countKey: "correspondencias" },
  { href: "/moradores", label: "Moradores", icon: Users },
]

const itemClassName =
  "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[0.7rem] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"

/** Barra de abas inferior, so abaixo de sm (no lugar das abas do header). */
export function BottomNav({
  moreItems,
  initialCounts,
}: {
  moreItems: { href: string; label: string }[]
  initialCounts: NavCounts
}) {
  // A aba tocada acende na hora; a confirmacao vem quando o pathname muda.
  const { caminhoAtivo, aoTocar } = useAbaOtimista()
  const counts = useNavCounts(initialCounts)
  const { resolvedTheme, setTheme } = useTheme()
  const { sair, saindo } = useLogout()

  const moreActive = moreItems.some((item) => isNavItemActive(caminhoAtivo, item.href))
  const isDark = resolvedTheme === "dark"

  return (
    <nav
      aria-label="Principal"
      className="bg-card fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-1 border-t px-1 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] sm:hidden"
    >
      {LINKS.map((link) => {
        const isActive = isNavItemActive(caminhoAtivo, link.href)
        const count = link.countKey ? counts[link.countKey] : 0

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            onClick={aoTocar(link.href)}
            className={cn(
              itemClassName,
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <LinkPendingHint className="inset-x-5 top-0 h-0.5" />
            <link.icon className="size-5" aria-hidden />
            {link.label}
            {count > 0 && (
              <span className="bg-primary text-primary-foreground absolute top-0.5 left-[calc(50%+0.25rem)] rounded-full px-1.5 py-0.5 font-mono text-[0.625rem] leading-none font-semibold tabular-nums">
                {count > 99 ? "99+" : count}
                <span className="sr-only"> pendentes</span>
              </span>
            )}
          </Link>
        )
      })}

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            itemClassName,
            "w-full",
            moreActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Ellipsis className="size-5" aria-hidden />
          Mais
          {/* A pagina atual esta dentro de "Mais": ponto de destaque, alem da cor. */}
          {moreActive && (
            <span
              aria-hidden
              className="bg-primary absolute top-1 left-[calc(50%+0.625rem)] size-1.5 rounded-full"
            />
          )}
          {moreActive && <span className="sr-only">, contém a página atual</span>}
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" sideOffset={8} className="min-w-52">
          {moreItems.map((item) => {
            const isActive = isNavItemActive(caminhoAtivo, item.href)

            // <Link> de verdade (nao router.push): ao abrir o menu, o Next ja
            // pre-carrega o esqueleto (loading.tsx) do destino.
            return (
              <DropdownMenuLinkItem
                key={item.href}
                aria-current={isActive ? "page" : undefined}
                render={<Link href={item.href} onClick={aoTocar(item.href)} />}
                className={cn(isActive && "text-primary font-semibold")}
              >
                {item.label}
              </DropdownMenuLinkItem>
            )
          })}
          {moreItems.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>
            {isDark ? <Sun /> : <Moon />}
            {isDark ? "Tema claro" : "Tema escuro"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={saindo}
            onClick={sair}
          >
            <LogOut />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}

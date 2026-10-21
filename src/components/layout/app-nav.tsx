"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import type { NavCounts } from "@/app/(app)/actions"
import { NavCount } from "@/components/layout/nav-count"
import { isNavItemActive, type NavItem } from "@/components/layout/nav-types"
import { useNavCounts } from "@/components/layout/use-nav-counts"
import { cn } from "@/lib/utils"

/** Abas sublinhadas do header (a partir de sm). */
export function AppNav({
  items,
  initialCounts,
  className,
  linkClassName,
}: {
  items: NavItem[]
  initialCounts: NavCounts
  className?: string
  /** Classes extras de cada aba (ex.: "mb-0" para tirar o -mb-px na faixa rolavel). */
  linkClassName?: string
}) {
  const pathname = usePathname()
  const counts = useNavCounts(initialCounts)

  if (items.length === 0) {
    return null
  }

  return (
    <nav aria-label="Principal" className={cn("flex items-stretch gap-0.5", className)}>
      {items.map((item) => {
        const isActive = isNavItemActive(pathname, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              isActive
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent",
              linkClassName
            )}
          >
            {item.label}
            {item.countKey && (
              <NavCount value={counts[item.countKey]} active={isActive} />
            )}
          </Link>
        )
      })}
    </nav>
  )
}

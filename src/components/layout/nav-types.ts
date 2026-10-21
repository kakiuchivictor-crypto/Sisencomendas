import type { NavCounts } from "@/app/(app)/actions"

export type NavItem = {
  href: string
  label: string
  /** Quando informado, a aba mostra o contador de pendentes correspondente. */
  countKey?: keyof NavCounts
}

/** Aba ativa: "/" so casa exato; as demais tambem casam subrotas. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

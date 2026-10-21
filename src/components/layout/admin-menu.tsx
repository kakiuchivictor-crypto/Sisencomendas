"use client"

import { Settings } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Engrenagem do header: so itens de administracao do sistema (Atividade,
 * Usuarios, Configuracoes). Relatorios virou aba da nav principal.
 * Os itens sao <Link> de verdade: ao abrir o menu, o Next ja pre-carrega o
 * esqueleto (loading.tsx) de cada destino, e o toque troca de tela na hora.
 */
export function AdminMenu({
  items,
}: {
  items: { href: string; label: string }[]
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({ variant: "ghost", size: "icon" })}
        aria-label="Menu de administração"
      >
        <Settings />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuLinkItem key={item.href} render={<Link href={item.href} />}>
            {item.label}
          </DropdownMenuLinkItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

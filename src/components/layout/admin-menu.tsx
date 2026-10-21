"use client"

import { Settings } from "lucide-react"
import { useRouter } from "next/navigation"

import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Engrenagem do header: so itens de administracao do sistema (Atividade,
 * Usuarios, Configuracoes). Relatorios virou aba da nav principal.
 */
export function AdminMenu({
  items,
}: {
  items: { href: string; label: string }[]
}) {
  const router = useRouter()

  if (items.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({ variant: "ghost", size: "icon" })}
        aria-label="Menu de administracao"
      >
        <Settings />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem key={item.href} onClick={() => router.push(item.href)}>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

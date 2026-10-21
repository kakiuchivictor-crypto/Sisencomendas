"use client"

import { LogOut } from "lucide-react"

import { useLogout } from "@/components/layout/use-logout"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const { sair, saindo } = useLogout()

  return (
    <Button variant="ghost" size="sm" disabled={saindo} onClick={sair}>
      <LogOut />
      Sair
    </Button>
  )
}

"use client"

import { LogOut } from "lucide-react"
import { useTransition } from "react"

import { logoutAction } from "@/app/(app)/actions"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => logoutAction())}
    >
      <LogOut />
      Sair
    </Button>
  )
}

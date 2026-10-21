"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { useIsClient } from "@/components/layout/theme-toggle"
import { cn } from "@/lib/utils"

const pillClassName =
  "border-border text-foreground inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border px-3.5 text-sm font-medium max-[480px]:px-0"

/**
 * Botao de tema do header do login: mesmo mecanismo do ThemeToggle do app
 * (next-themes, classe .dark no <html>), so com o visual em pilula e o
 * rotulo em texto — escondido em telas estreitas, onde fica so o icone.
 */
export function LoginThemeButton() {
  const { resolvedTheme, setTheme } = useTheme()
  const isClient = useIsClient()

  // No SSR o tema ainda nao e conhecido: reserva o espaco sem rotulo errado.
  if (!isClient) {
    return (
      <span aria-hidden="true" className={cn(pillClassName, "invisible")}>
        <Moon className="size-4.5" />
        <span className="max-[480px]:hidden">Tema escuro</span>
      </span>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      className={cn(
        pillClassName,
        "hover:border-field-line cursor-pointer bg-transparent transition-colors outline-none focus-visible:outline-[2.5px] focus-visible:outline-offset-3 focus-visible:outline-primary motion-reduce:transition-none"
      )}
    >
      {isDark ? (
        <Sun className="size-4.5" aria-hidden="true" />
      ) : (
        <Moon className="size-4.5" aria-hidden="true" />
      )}
      <span className="max-[480px]:hidden">{isDark ? "Tema claro" : "Tema escuro"}</span>
    </button>
  )
}

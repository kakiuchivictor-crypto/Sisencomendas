"use client"

import { useTheme } from "next-themes"
import { useEffect } from "react"

/**
 * Aplica o tema padrao configurado pelo admin (Configuracoes) apenas na
 * primeira visita deste navegador — se o usuario ja tiver escolhido um tema
 * manualmente (via ThemeToggle), a preferencia dele sempre prevalece.
 */
export function ApplyCondominioTheme({ tema }: { tema: "claro" | "escuro" }) {
  const { setTheme } = useTheme()

  useEffect(() => {
    if (!window.localStorage.getItem("theme")) {
      setTheme(tema === "escuro" ? "dark" : "light")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roda apenas uma vez, ao montar
  }, [])

  return null
}

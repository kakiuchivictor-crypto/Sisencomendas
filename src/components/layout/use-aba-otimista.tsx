"use client"

import { useLinkStatus } from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { cn } from "@/lib/utils"

/**
 * Aba ativa "otimista": a aba tocada acende na hora do toque, sem esperar o
 * usePathname mudar (que so muda quando a navegacao e confirmada). Quando o
 * pathname muda (navegacao concluida, redirecionada ou outra navegacao), o
 * toque guardado deixa de valer sozinho, sem useEffect: ele so conta enquanto
 * o pathname ainda for o de origem do toque.
 */
export function useAbaOtimista() {
  const pathname = usePathname()
  const [toque, setToque] = useState<{ href: string; origem: string } | null>(null)

  const hrefTocado = toque && toque.origem === pathname ? toque.href : null

  function aoTocar(href: string) {
    return (event: React.MouseEvent<HTMLAnchorElement>) => {
      // Ctrl/Cmd/Shift + clique abre em outra aba/janela: a atual nao navega.
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }
      setToque({ href, origem: pathname })
    }
  }

  return {
    /** Caminho a usar para decidir a aba ativa (o tocado, enquanto pendente). */
    caminhoAtivo: hrefTocado ?? pathname,
    aoTocar,
  }
}

/**
 * Indicador discreto de navegacao pendente. Precisa ficar DENTRO do <Link>
 * (useLinkStatus le o estado do link ancestral). Sempre renderizado e
 * posicionado em absoluto, so alterna a opacidade: nao causa layout shift.
 */
export function LinkPendingHint({ className }: { className?: string }) {
  const { pending } = useLinkStatus()

  return (
    <span
      aria-hidden
      className={cn(
        "bg-primary pointer-events-none absolute rounded-full opacity-0 transition-opacity",
        pending && "animate-pulse opacity-100",
        className
      )}
    />
  )
}

import { cn } from "@/lib/utils"

/*
 * Simbolo unico da marca LogixOne: caixa isometrica (cubo) em traco, com a
 * face superior preenchida suave. E o MESMO desenho usado em:
 *   - src/app/icon.svg (favicon / icone "any" do manifest)
 *   - src/app/apple-icon.tsx (iOS, "Adicionar a Tela de Inicio")
 *   - src/app/pwa-icon/route.tsx (icones 192/512 do PWA)
 *   - public/offline.html (marca na pagina offline do service worker)
 *   - header do login e header do app (LogixOneMark / LogixOneLogo)
 *   - selo grande animado do login (LogixOneSeal)
 * Se mudar o desenho, mude as constantes abaixo E esses arquivos (que nao
 * conseguem importar daqui: SVG/HTML estaticos e ImageResponse).
 *
 * Cores do tile sao FIXAS (nao tokens que invertem com o tema) para o
 * simbolo ser identico ao favicon/icone instalado nos dois temas.
 */

/** Contorno externo do cubo (hexagono), no espaco 32x32 do tile. */
export const CUBE_OUTLINE = "M16 6.5l8.5 4.9v9.2L16 25.5l-8.5-4.9v-9.2L16 6.5z"
/** Arestas internas (Y): face superior + aresta vertical frontal. */
export const CUBE_EDGES = "M7.5 11.4L16 16.3l8.5-4.9M16 16.3v9.2"
/** Face superior (losango), preenchida com opacidade baixa. */
export const CUBE_TOP = "M16 6.5l8.5 4.9L16 16.3l-8.5-4.9L16 6.5z"

/*
 * Cores em hex (e nao oklch) para dar exatamente os mesmos pixels dos
 * icones PNG/SVG: #004296 = --primary do tema claro, oklch(0.4 0.15 258),
 * convertido para sRGB; #f6f9fd = --primary-foreground, oklch(0.98 0.006 258).
 */
export const BRAND_TILE = "#004296"
export const BRAND_INK = "#f6f9fd"

/**
 * Simbolo estatico (tile indigo + cubo claro). Decorativo — o nome da marca
 * vem em texto ao lado (LogixOneLogo) ou num aria-label de quem usar so ele.
 */
export function LogixOneMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("size-8 shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" fill={BRAND_TILE} />
      {/* Borda sutil so no escuro: separa o tile do fundo quase preto. */}
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="7.5"
        className="stroke-transparent dark:stroke-white/15"
      />
      <path d={CUBE_TOP} fill={BRAND_INK} fillOpacity="0.28" />
      <path
        d={CUBE_OUTLINE}
        stroke={BRAND_INK}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d={CUBE_EDGES}
        stroke={BRAND_INK}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Wordmark "LogixOne": mesma fonte/peso no login e no header do app. */
export function LogixOneWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-heading text-foreground leading-none font-semibold tracking-tight",
        className
      )}
    >
      Logix<span className="text-primary">One</span>
    </span>
  )
}

/** Simbolo + wordmark. */
export function LogixOneLogo({
  className,
  markClassName,
  wordmarkClassName,
}: {
  className?: string
  markClassName?: string
  wordmarkClassName?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogixOneMark className={markClassName} />
      <LogixOneWordmark className={cn("text-lg", wordmarkClassName)} />
    </span>
  )
}

/**
 * Selo grande do login: o mesmo cubo, sem tile, em traco fino na cor de
 * destaque do tema, que "se desenha" (stroke-dashoffset, via pathLength=1)
 * e depois acende a face superior. Animacao em globals.css (.lx-seal-*),
 * desligada com prefers-reduced-motion (fica o desenho final, estatico).
 */
export function LogixOneSeal({ className }: { className?: string }) {
  return (
    <svg
      // Recorte quadrado do espaco 32x32 com o cubo ocupando ~2/3 da largura
      // (mesmo respiro do prototipo aprovado).
      viewBox="3.25 3.65 25.5 25.5"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("text-primary", className)}
    >
      <path d={CUBE_TOP} className="lx-seal-top" fill="currentColor" />
      <path
        d={CUBE_OUTLINE}
        pathLength={1}
        className="lx-seal-edge"
        stroke="currentColor"
        strokeWidth="0.57"
        strokeLinejoin="round"
      />
      <path
        d={CUBE_EDGES}
        pathLength={1}
        className="lx-seal-edge"
        stroke="currentColor"
        strokeWidth="0.57"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

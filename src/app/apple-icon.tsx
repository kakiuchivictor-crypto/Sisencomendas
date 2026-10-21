import { ImageResponse } from "next/og"

import {
  BRAND_INK,
  BRAND_TILE,
  CUBE_EDGES,
  CUBE_OUTLINE,
  CUBE_TOP,
} from "@/components/brand/logixone-logo"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

/**
 * Convencao de arquivo do Next: gera automaticamente a tag
 * <link rel="apple-touch-icon"> — o icone usado pelo iOS ao "Adicionar a
 * Tela de Inicio". Mesmo simbolo de src/components/brand/logixone-logo.tsx e src/app/icon.svg.
 */
export default function AppleIcon() {
  // Tile em tela cheia (o iOS arredonda os cantos sozinho), com o cubo na
  // mesma proporcao do favicon: o desenho 32x32 inteiro escalado para 180.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: BRAND_TILE,
        }}
      >
        <svg
          width="180"
          height="180"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
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
      </div>
    ),
    { ...size }
  )
}

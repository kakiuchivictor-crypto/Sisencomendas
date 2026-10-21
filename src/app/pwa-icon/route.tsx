import { ImageResponse } from "next/og"
import type { NextRequest } from "next/server"

import {
  BRAND_INK,
  BRAND_TILE,
  CUBE_EDGES,
  CUBE_OUTLINE,
  CUBE_TOP,
} from "@/components/brand/logixone-logo"

/**
 * Icone PWA (192x192 ou 512x512, via ?size=) gerado a partir do mesmo
 * simbolo de src/components/brand/logixone-logo.tsx (= src/app/icon.svg) —
 * usado pelo manifest.ts para o icone da tela inicial ao instalar o app.
 */
export async function GET(request: NextRequest) {
  const sizeParam = Number(request.nextUrl.searchParams.get("size"))
  const size = sizeParam === 512 ? 512 : 192

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="32" height="32" rx="8" fill={BRAND_TILE} />
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
    {
      width: size,
      height: size,
      // Rota publica e so existem 2 variantes (192/512): deixa a CDN da
      // Vercel guardar o PNG para nao renderizar a imagem a cada requisicao
      // (o padrao do next/og e max-age=0, que permitiria forcar CPU a toa).
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" },
    }
  )
}

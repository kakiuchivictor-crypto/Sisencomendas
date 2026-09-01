import { ImageResponse } from "next/og"
import type { NextRequest } from "next/server"

export const runtime = "edge"

/**
 * Icone PWA (192x192 ou 512x512, via ?size=) gerado a partir do mesmo
 * desenho de src/app/icon.svg — usado pelo manifest.ts para o icone da tela
 * inicial ao instalar o app no celular.
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
          <rect width="32" height="32" rx="8" fill="#2f3ea3" />
          <path
            d="M16 6.5l8.5 4.9v9.2L16 25.5l-8.5-4.9v-9.2L16 6.5z"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M7.5 11.4L16 16.3l8.5-4.9M16 16.3v9.2"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { width: size, height: size }
  )
}

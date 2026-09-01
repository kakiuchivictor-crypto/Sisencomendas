import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

/**
 * Convencao de arquivo do Next: gera automaticamente a tag
 * <link rel="apple-touch-icon"> — o icone usado pelo iOS ao "Adicionar a
 * Tela de Inicio". Mesmo desenho de src/app/icon.svg.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2f3ea3",
        }}
      >
        <svg
          width="130"
          height="130"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
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
    { ...size }
  )
}

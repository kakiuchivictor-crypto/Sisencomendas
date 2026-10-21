import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LogixOne · Controle de encomendas",
    short_name: "LogixOne",
    description: "LogixOne · Controle de encomendas para condomínios",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    // Mesmo off-white do --background (oklch(0.995 0.002 258)) para a splash
    // do PWA nao "piscar" branco puro antes do app pintar.
    background_color: "#fdfdff",
    theme_color: "#004296",
    lang: "pt-BR",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/pwa-icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/pwa-icon?size=512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}

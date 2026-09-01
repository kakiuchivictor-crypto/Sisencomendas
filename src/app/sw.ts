/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist"
import { NetworkOnly, Serwist } from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

/**
 * So precacha o "app shell" (chunks JS/CSS do build + arquivos estaticos de
 * /public: icones, manifest, offline.html) — nunca HTML de pagina. Navegacao
 * usa NetworkOnly (sempre busca na rede, nunca guarda em cache): guardar
 * HTML dinamico/por-tenant no cache do navegador vazaria dados entre
 * usuarios diferentes logados no mesmo dispositivo compartilhado (ex:
 * portaria com um tablet usado por varios porteiros). Se a rede falhar
 * numa navegacao, cai no fallback pre-cacheado /offline.html.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkOnly(),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline.html",
        matcher: ({ request }) => request.mode === "navigate",
      },
    ],
  },
})

serwist.addEventListeners()

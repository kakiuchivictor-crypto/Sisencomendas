import { serwist } from "@serwist/next/config"

// Modo configurador do Serwist: bundler-agnostico, funciona com Turbopack
// (o modo classico via next.config.ts webpack() nao funciona porque este
// projeto builda com Turbopack por padrao — ver next.config.ts). Roda como
// um passo separado depois de `next build` (ver script "build" no
// package.json), gerando public/sw.js a partir de src/app/sw.ts.
export default serwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
})

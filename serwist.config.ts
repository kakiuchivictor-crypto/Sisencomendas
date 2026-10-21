import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"

import { serwist } from "@serwist/next/config"

/**
 * Chunks que NAO entram no precache do service worker. Sao as bibliotecas de
 * exportacao (Excel/PDF de Relatorios e Atividade), carregadas sob demanda por
 * import() so quando alguem exporta, e que juntas passavam de 500 KB gzip: com
 * elas no precache, todo celular baixava tudo isso na instalacao/atualizacao
 * do app, mesmo o porteiro que nunca exporta nada. Sem precache, continuam
 * funcionando normalmente: o navegador busca o chunk na hora do clique (a
 * exportacao ja precisa de rede para trazer os dados).
 *
 * A identificacao e pelo CONTEUDO do chunk, nao pelo nome/hash (que mudam a
 * cada build): cada marcador e uma string que so existe no codigo daquela
 * biblioteca.
 */
const MARCADORES_EXPORTACAO = [
  "ExcelJS", // exceljs
  "jsPDF", // jspdf / jspdf-autotable
  "html2canvas", // dependencia opcional do jspdf
  "Canvg", // canvg (SVG -> canvas, usado pelo jspdf)
  "DOMPurify", // dompurify (usado pelo jspdf no .html())
  "decodeIHDR", // decodificador PNG do jspdf (fast-png)
]

/** O leitor de codigo de barras e usado offline na portaria: nunca sai. */
const MARCADORES_MANTER = ["BrowserMultiFormatReader", "ZXing"]

/** core-js entra no bundle so como dependencia do canvg/jspdf. */
const MARCADOR_CORE_JS = "core-js"

/**
 * Chunks assincronos do webpack (carregados so por import()) tem nome
 * "<id>.<hash>.js"; os iniciais usam "<nome>-<hash>.js". Restringir aos
 * assincronos garante que nada do carregamento inicial sai do precache.
 */
const CHUNK_ASSINCRONO = /\/static\/chunks\/[^/-]+\.[0-9a-f]+\.js$/

function deveSairDoPrecache(url: string): boolean {
  // Polyfills do Next: so baixados por navegadores antigos (nomodule).
  if (/\/static\/chunks\/polyfills-[0-9a-f]+\.js$/.test(url)) {
    return true
  }

  if (!CHUNK_ASSINCRONO.test(url)) {
    return false
  }

  let conteudo: string
  try {
    conteudo = readFileSync(path.join(process.cwd(), url), "utf8")
  } catch {
    return false
  }

  if (MARCADORES_MANTER.some((marcador) => conteudo.includes(marcador))) {
    return false
  }

  return (
    MARCADORES_EXPORTACAO.some((marcador) => conteudo.includes(marcador)) ||
    conteudo.includes(MARCADOR_CORE_JS)
  )
}

/**
 * Arquivos de /public que entram no precache, com a URL EXATA em que sao
 * servidos. Lista explicita (allowlist) em vez do glob padrao "public/**":
 *  - o glob padrao do @serwist/next transformava "public/offline.html" em
 *    "/public/offline" (tira o ".html" antes de tirar o "public/"), URL que
 *    nao existe: o fallback offline (/offline.html) nunca ficava em cache e a
 *    instalacao do service worker pedia uma URL redirecionada pelo proxy;
 *  - os demais arquivos de /public (SVGs de exemplo do create-next-app, sem
 *    uso) passam pelo proxy.ts e respondem 307 para /login sem sessao.
 * Cada arquivo daqui precisa estar na exclusao do matcher de src/proxy.ts.
 * additionalPrecacheEntries entra DEPOIS dos manifestTransforms, entao a URL
 * nao e reescrita.
 */
const ARQUIVOS_PUBLICOS_PRECACHE = ["offline.html"]

function entradaPublica(arquivo: string) {
  const conteudo = readFileSync(path.join(process.cwd(), "public", arquivo))
  return {
    url: `/${arquivo}`,
    revision: createHash("md5").update(conteudo).digest("hex"),
  }
}

// Modo configurador do Serwist: bundler-agnostico. Roda como um passo
// separado depois de `next build` (ver script "build" no package.json),
// gerando public/sw.js a partir de src/app/sw.ts.
export default serwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // So o build estatico do Next (.next/static, sempre 200, com hash no nome);
  // /public entra pela allowlist acima.
  globPatterns: [
    ".next/static/**/*.{js,css,html,ico,apng,png,avif,jpg,jpeg,jfif,pjpeg,pjp,gif,svg,webp,json,webmanifest}",
  ],
  // Nunca HTML de pagina no precache (ver src/app/sw.ts): sem isto, uma
  // pagina que um dia fosse pre-renderizada entraria no cache do navegador.
  precachePrerendered: false,
  additionalPrecacheEntries: ARQUIVOS_PUBLICOS_PRECACHE.map(entradaPublica),
  // Roda antes da transformacao padrao do @serwist/next, entao as URLs ainda
  // sao caminhos relativos ao projeto (ex.: ".next/static/chunks/123.abc.js").
  manifestTransforms: [
    (entries) => {
      const removidos: string[] = []
      const manifest = entries.filter((entry) => {
        if (deveSairDoPrecache(entry.url)) {
          removidos.push(`${path.basename(entry.url)} (${Math.round(entry.size / 1024)} KB)`)
          return false
        }
        return true
      })

      if (removidos.length > 0) {
        console.log(`[serwist] fora do precache: ${removidos.join(", ")}`)
      }

      return { manifest, warnings: [] }
    },
  ],
})

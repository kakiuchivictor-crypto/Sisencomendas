import { NextResponse, type NextRequest } from "next/server"

import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware"

const PUBLIC_PATHS = ["/login"]

// Comparacao exata (ou subcaminho com "/"), nunca prefixo solto: com
// startsWith("/login"), qualquer rota futura que comece com essas letras
// ("/login-admin", "/loginhistorico"...) ficaria publica por acidente.
function isPublicPathname(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

const isDev = process.env.NODE_ENV !== "production"

// O client Supabase do navegador (auth + Realtime) fala direto com o projeto
// Supabase, fora do nosso proprio dominio — precisa estar liberado em
// connect-src explicitamente (https para REST/Auth, wss para o websocket do
// Realtime), senao o navegador bloqueia essas conexoes por CSP mesmo que o
// codigo esteja correto.
const SUPABASE_ORIGIN = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_CONNECT_SRC = SUPABASE_ORIGIN
  ? `${SUPABASE_ORIGIN} ${SUPABASE_ORIGIN.replace(/^https:/, "wss:")}`
  : ""

/**
 * CSP com nonce por requisicao — o script-src usa 'nonce-<valor>' em vez de
 * 'unsafe-inline', entao os scripts inline que o proprio Next injeta para
 * hidratar a pagina (streaming do RSC payload) continuam rodando, mas
 * qualquer script inline injetado por um ataque de XSS (sem o nonce certo)
 * e bloqueado. O nonce muda a cada requisicao, entao nao da pra prever/
 * reusar. Ver https://nextjs.org/docs/app/guides/content-security-policy.
 */
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${SUPABASE_CONNECT_SRC}${isDev ? " ws:" : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ")
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublicPath = isPublicPathname(pathname)

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const cspHeader = buildCsp(nonce)

  // Resposta "seguinte" (deixa a requisicao seguir para a pagina). Criada
  // por funcao porque o client Supabase a RECRIA quando renova a sessao:
  // new Headers(request.headers) e lido na hora, entao ja inclui o cabecalho
  // "cookie" com o token novo (ver lib/supabase/middleware.ts), e o nonce e
  // o CSP sao reaplicados em toda versao da response.
  function criarRespostaSeguinte() {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-nonce", nonce)
    requestHeaders.set("Content-Security-Policy", cspHeader)

    const resposta = NextResponse.next({ request: { headers: requestHeaders } })
    resposta.headers.set("Content-Security-Policy", cspHeader)
    return resposta
  }

  const { supabase, getResponse } = createSupabaseMiddlewareClient(
    request,
    criarRespostaSeguinte
  )

  // getClaims() (nao getSession()) renova a sessao se o access token tiver
  // expirado (gravando os cookies sb-* novos na response, como o getUser()
  // fazia) e VERIFICA a assinatura do JWT localmente com a chave publica do
  // projeto (JWKS, em cache por 10 min): sem ida ao GoTrue a cada requisicao.
  // getSession() sozinho nao verifica a assinatura e nao pode ser usado aqui.
  // Trade-off: sessao revogada/usuario banido no GoTrue so perde efeito aqui
  // quando o access token expira (1h); perfil e exclusao em "usuarios" valem
  // na hora (ver services/auth/session.ts). Se o projeto assinar com chave
  // simetrica (HS256), getClaims() cai em getUser() sozinho.
  //
  // getClaims() pode LANCAR excecao com um JWT malformado ou forjado (ex.:
  // alg "none", ou RS256 com o kid de uma chave real e assinatura invalida),
  // o que virava erro 500. Qualquer excecao conta como "nao autenticado" e
  // segue o fluxo normal (redirect para /login). O token nunca e logado.
  let isAuthenticated: boolean
  try {
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
    isAuthenticated = !claimsError && typeof claimsData?.claims?.sub === "string"
  } catch {
    isAuthenticated = false
  }

  // Lida DEPOIS do getClaims(): se a sessao foi renovada, e a versao recriada.
  const response = getResponse()

  if (!isAuthenticated && !isPublicPath) {
    return redirecionar(new URL("/login", request.url), response, cspHeader)
  }

  if (isAuthenticated && isPublicPath) {
    return redirecionar(new URL("/", request.url), response, cspHeader)
  }

  return response
}

// Cabecalhos anti-cache que o @supabase/ssr coloca junto com os cookies de
// sessao (resposta com cookie de sessao nao pode ser guardada por CDN).
const CABECALHOS_ANTI_CACHE = ["Cache-Control", "Expires", "Pragma"]

/**
 * Redirect que leva adiante os cookies sb-* renovados (senao a sessao nao
 * avanca) e os cabecalhos anti-cache que vieram com eles.
 */
function redirecionar(destino: URL, de: NextResponse, cspHeader: string) {
  const redirectResponse = NextResponse.redirect(destino)
  redirectResponse.headers.set("Content-Security-Policy", cspHeader)

  for (const cookie of de.cookies.getAll()) {
    redirectResponse.cookies.set(cookie)
  }
  for (const nome of CABECALHOS_ANTI_CACHE) {
    const valor = de.headers.get(nome)
    if (valor !== null) {
      redirectResponse.headers.set(nome, valor)
    }
  }

  return redirectResponse
}

// Cada exclusao e ancorada com (?:$|/): o item precisa ser o segmento
// inteiro, nao so um prefixo. Sem a ancora, "/pwa-iconqualquercoisa" ou
// "/sw.jsx" pulariam o proxy (sem checagem de sessao e sem CSP). A query
// string (ex.: /pwa-icon?size=192) nao faz parte do pathname avaliado aqui.
export const config = {
  matcher: [
    "/((?!(?:_next/static|_next/image|favicon\\.ico|icon\\.svg|apple-icon|pwa-icon|opengraph-image|twitter-image|manifest\\.webmanifest|sw\\.js|offline\\.html)(?:$|/)).*)",
  ],
}

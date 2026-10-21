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

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", cspHeader)

  // Resposta "base": e nela que o client Supabase escreve os cookies
  // sb-* renovados. Precisa existir antes de decidir se vai redirecionar,
  // porque mesmo numa resposta de redirect os cookies renovados tem que
  // ser carregados adiante (senao a sessao nao avanca).
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Content-Security-Policy", cspHeader)

  const supabase = createSupabaseMiddlewareClient(request, response)

  // getUser() (nao getSession()) valida a sessao contra o servidor do
  // Supabase Auth a cada requisicao — e o unico jeito seguro de confiar
  // nessa checagem aqui no middleware.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAuthenticated = user !== null

  if (!isAuthenticated && !isPublicPath) {
    const redirectResponse = NextResponse.redirect(new URL("/login", request.url))
    redirectResponse.headers.set("Content-Security-Policy", cspHeader)
    copyCookies(response, redirectResponse)
    return redirectResponse
  }

  if (isAuthenticated && isPublicPath) {
    const redirectResponse = NextResponse.redirect(new URL("/", request.url))
    redirectResponse.headers.set("Content-Security-Policy", cspHeader)
    copyCookies(response, redirectResponse)
    return redirectResponse
  }

  return response
}

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie)
  }
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

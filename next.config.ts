import type { NextConfig } from "next";

// Em dev, o webpack HMR/React Refresh do Next precisa de 'unsafe-eval' para
// os source maps funcionarem — nao se aplica ao build de producao.
const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy NAO fica aqui: precisa de um nonce diferente por
// requisicao (senao os scripts inline que o Next usa pra hidratar a pagina
// ficam bloqueados e a UI fica sem reagir a cliques). Ela e montada e
// aplicada em src/proxy.ts.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
];

// HSTS so faz sentido (e so e respeitado pelo navegador) sobre HTTPS. Em dev
// o servidor fala HTTP puro em localhost; mandar esse cabecalho mesmo assim
// faz o navegador tentar forcar https://localhost nas proximas visitas, o
// que o servidor de dev nao atende — resulta em "redirecionamento em
// excesso" (ERR_TOO_MANY_REDIRECTS). So enviado em producao.
if (!isDev) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  });
}

const nextConfig: NextConfig = {
  // Nao anuncia "X-Powered-By: Next.js" (evita fingerprint de versao).
  poweredByHeader: false,
  // Em dev, o Next so aceita requisicoes de Server Action vindas de hosts
  // explicitamente confiaveis (protecao contra CSRF). Sem isso, acessar via
  // 127.0.0.1 (em vez de localhost) faz o login parecer travado: o POST da
  // action e rejeitado silenciosamente antes de chegar no codigo do app.
  ...(isDev ? { allowedDevOrigins: ["127.0.0.1", "localhost"] } : {}),
  experimental: {
    // Cache do router no navegador para paginas dinamicas: voltar a uma aba
    // visitada ha menos de 30s reaproveita o payload ja recebido, sem nova ida
    // ao servidor (padrao do Next 15+ e 0s). Os dados vivos das listas vem do
    // TanStack Query (Realtime + invalidacao), nao deste payload. Qualquer
    // revalidatePath/router.refresh limpa esse cache na hora. Efeito colateral
    // aceito: mudanca de perfil/permissao pode levar ate 30s para refletir na
    // UI de uma aba ja visitada (o servidor continua checando a cada acao).
    staleTimes: {
      dynamic: 30,
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

// O service worker (Serwist) NAO e configurado aqui: este projeto builda com
// Turbopack (padrao do Next 16), e o modo classico do @serwist/next depende
// do hook `webpack()` do next.config, incompativel com Turbopack. Em vez
// disso usamos o "modo configurador" (serwist.config.ts na raiz + `serwist
// build` como passo separado apos `next build`) — ver serwist.config.ts e o
// script "build" no package.json.
export default nextConfig;

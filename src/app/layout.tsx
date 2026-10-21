import { SerwistProvider } from "@serwist/next/react";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Plus_Jakarta_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { Providers } from "./providers";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-data-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "LogixOne",
    template: "%s | LogixOne",
  },
  applicationName: "LogixOne",
  description: "LogixOne · Controle de encomendas para condomínios",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "LogixOne",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#004296",
  width: "device-width",
  initialScale: 1,
  // Com o teclado virtual aberto, o layout encolhe (em vez de so a viewport
  // visual), para o rodape da folha inferior nao ficar escondido atras dele.
  interactiveWidget: "resizes-content",
};

// O CSP usa um nonce novo por requisicao (ver src/proxy.ts). Se alguma
// pagina fosse pre-renderizada como estatica, o HTML em cache ficaria com
// um nonce desatualizado, incompativel com o header CSP de cada requisicao
// nova — o navegador bloquearia todo script inline (app "trava" sem erro
// visivel). force-dynamic garante que toda pagina renderiza no request,
// nunca em build/cache.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Nonce gerado por requisicao em src/proxy.ts (header x-nonce). O Next ja
  // aplica sozinho nos scripts dele; o script inline do next-themes (que
  // aplica o tema antes da hidratacao) precisa recebe-lo explicitamente,
  // senao e bloqueado pelo CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SerwistProvider swUrl="/sw.js" disable={process.env.NODE_ENV !== "production"}>
          <Providers nonce={nonce}>{children}</Providers>
        </SerwistProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next"
import { Newsreader } from "next/font/google"

import { LogixOneLogo, LogixOneSeal } from "@/components/brand/logixone-logo"

import { LoginForm } from "./login-form"
import { LoginThemeButton } from "./login-theme-button"

// Serifa editorial so do titulo do login (fonte variavel com eixo de
// tamanho optico; servida pelo proprio app via next/font — CSP sem externos).
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-login-serif",
})

export const metadata: Metadata = {
  // absolute: o login fica fora do template "%s | LogixOne" so por clareza;
  // o resultado e o mesmo texto da aba.
  title: { absolute: "Login | LogixOne" },
}

/*
 * Data por extenso no fuso da portaria. Calculada no servidor (o layout
 * raiz e force-dynamic, entao roda a cada requisicao) e enviada pronta no
 * HTML: o cliente nao recalcula, entao nao ha divergencia de hidratacao.
 */
function todayLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date())
}

export default function LoginPage() {
  return (
    <div
      className={`${newsreader.variable} grid min-h-dvh flex-1 grid-rows-[auto_1fr_auto]`}
    >
      <header>
        <div className="short:py-3 mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-[clamp(20px,5vw,56px)] py-[22px]">
          <LogixOneLogo />
          <LoginThemeButton />
        </div>
      </header>

      {/* Variantes short/tiny (globals.css): em telas baixas os espacos e o
          titulo encolhem para a pagina caber inteira, sem barra de rolagem. */}
      <main className="short:pb-3 grid place-items-center pt-1 pb-7 lg:pt-0">
        <div className="w-full max-w-[440px] px-5 lg:max-w-[480px]">
          <LogixOneSeal className="short:mb-4 short:size-10 tiny:hidden mb-7 block size-14 min-[481px]:size-15" />

          <p className="text-muted-foreground short:mb-2 mb-3.5 text-[13px] font-semibold tracking-[0.14em] uppercase">
            Portaria · <time>{todayLabel()}</time>
          </p>

          <h1 className="short:mb-2.5 short:text-[clamp(34px,5vw,46px)] mb-4 font-[family-name:var(--font-login-serif)] text-[clamp(40px,7vw,60px)] leading-[1.02] font-normal tracking-[-0.02em] [font-variation-settings:'opsz'_72]">
            Cada entrega,
            <br />
            <em className="text-primary italic">registrada.</em>
          </h1>

          <p className="text-muted-foreground short:mb-5 short:text-[15px] mb-8 max-w-[34ch] text-[16.5px] leading-relaxed min-[481px]:mb-[34px] min-[481px]:short:mb-5">
            Entre com o e-mail e a senha fornecidos pela administração do seu
            condomínio.
          </p>

          <LoginForm />

          <p className="text-muted-foreground short:mt-4 short:pt-3 short:text-[13.5px] mt-7 border-t pt-5 text-[14.5px] leading-relaxed">
            <strong className="text-foreground font-semibold">
              Problemas para entrar?
            </strong>{" "}
            Fale com a administração do condomínio.
          </p>
        </div>
      </main>

      <footer>
        <div className="text-muted-foreground short:pt-2 short:pb-3 mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-[clamp(20px,5vw,56px)] pt-[18px] pb-6 text-[13px] max-[480px]:flex-col max-[480px]:items-start max-[480px]:gap-1">
          <span>LogixOne · Controle de encomendas para condomínios</span>
          <span className="tiny:hidden">Acesso restrito à equipe autorizada</span>
        </div>
      </footer>
    </div>
  )
}

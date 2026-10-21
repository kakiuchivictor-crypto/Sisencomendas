"use server"

import { loginSchema } from "@/schemas/auth"
import { signInWithPassword } from "@/services/auth/auth-service"

export type LoginActionResult = {
  error?: string
}

/**
 * Sem redirect no servidor: em caso de sucesso devolve {} e o formulario
 * limpa o cache do TanStack e faz uma navegacao COMPLETA para "/" (ver
 * login-form.tsx), para que nada do usuario anterior (sessao expirada no
 * mesmo aparelho) sobreviva em memoria ao login de outro usuario.
 */
export async function loginAction(input: {
  email: string
  password: string
}): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse(input)

  if (!parsed.success) {
    return { error: "Preencha e-mail e senha corretamente." }
  }

  const result = await signInWithPassword(parsed.data.email, parsed.data.password)

  if (!result.success) {
    if (result.error === "muitas_tentativas") {
      return {
        error: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
      }
    }
    return { error: "E-mail ou senha incorretos." }
  }

  return {}
}

"use server"

import { redirect } from "next/navigation"

import { loginSchema } from "@/schemas/auth"
import { signInWithPassword } from "@/services/auth/auth-service"

export type LoginActionResult = {
  error?: string
}

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

  redirect("/")
}

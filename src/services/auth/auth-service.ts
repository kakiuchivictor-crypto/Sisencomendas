import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"

export type SignInResult =
  | { success: true }
  | { success: false; error: "credenciais_invalidas" }
  | { success: false; error: "muitas_tentativas" }

/**
 * Login via Supabase Auth (GoTrue) real — ele ja cuida de comparacao de
 * senha em tempo constante e de rate limiting de tentativas, entao o app nao
 * precisa mais reimplementar isso (como fazia no shim local com bcrypt +
 * tabela login_throttle).
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<SignInResult> {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.status === 429) {
      return { success: false, error: "muitas_tentativas" }
    }
    return { success: false, error: "credenciais_invalidas" }
  }

  return { success: true }
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
}

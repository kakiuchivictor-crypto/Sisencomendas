import { z } from "zod"

import { USUARIO_ROLE_VALUES } from "@/lib/labels"

export const usuarioCreateSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(120),
  email: z.string().trim().min(1, "Informe o e-mail").email("E-mail inválido"),
  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
  role: z.enum(USUARIO_ROLE_VALUES),
})

export const usuarioUpdateSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(120),
  role: z.enum(USUARIO_ROLE_VALUES),
})

export type UsuarioCreateInput = z.infer<typeof usuarioCreateSchema>
export type UsuarioUpdateInput = z.infer<typeof usuarioUpdateSchema>

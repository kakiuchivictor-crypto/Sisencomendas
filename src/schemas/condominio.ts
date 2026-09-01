import { z } from "zod"

export const condominioSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do condominio").max(120),
  tema: z.enum(["claro", "escuro"]),
})

export type CondominioInput = z.infer<typeof condominioSchema>

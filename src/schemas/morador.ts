import { z } from "zod"

export const moradorSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(120),
  rua: z.string().trim().min(1, "Informe a rua").max(120),
  numero: z.string().trim().min(1, "Informe o número").max(20),
  observacoes: z.string().trim().max(500).optional(),
})

export type MoradorInput = z.infer<typeof moradorSchema>

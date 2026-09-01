import { z } from "zod"

/** Remetente vem de uma lista aberta por condominio (ver schema/remetentes.ts),
 * nao mais do enum fixo de transportadora — cartorio/IP Urgente/DHL nao sao
 * "transportadoras" de e-commerce. */
const correspondenciaItemSchema = z.object({
  remetenteId: z.string().min(1, "Selecione o remetente"),
  quantidade: z
    .number()
    .int("Quantidade deve ser um numero inteiro")
    .min(1, "Quantidade minima e 1")
    .max(999, "Quantidade maxima e 999"),
  codigoRastreio: z.string().trim().max(60).optional(),
})

const correspondenciaBaseSchema = z.object({
  moradorId: z.string().min(1, "Selecione o morador"),
  rua: z.string().trim().min(1, "Informe a rua").max(120),
  numero: z.string().trim().min(1, "Informe o numero").max(20),
  observacoes: z.string().trim().max(500).optional(),
})

export const correspondenciaCreateSchema = correspondenciaBaseSchema.extend(
  correspondenciaItemSchema.shape
)

/** Adicionar um item novo a uma correspondencia pendente ja existente. */
export const correspondenciaAddItemSchema = correspondenciaItemSchema

/** Edicao de uma correspondencia ja existente. */
export const correspondenciaUpdateSchema = correspondenciaBaseSchema.extend(
  correspondenciaItemSchema.shape
)

export type CorrespondenciaCreateInput = z.infer<
  typeof correspondenciaCreateSchema
>
export type CorrespondenciaAddItemInput = z.infer<
  typeof correspondenciaAddItemSchema
>
export type CorrespondenciaUpdateInput = z.infer<
  typeof correspondenciaUpdateSchema
>

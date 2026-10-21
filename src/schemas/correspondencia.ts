import { z } from "zod"

import { exigirIdentificacao } from "./identificacao"

/** Remetente vem de uma lista aberta por condominio (ver schema/remetentes.ts),
 * nao mais do enum fixo de transportadora — cartorio/IP Urgente/DHL nao sao
 * "transportadoras" de e-commerce. */
const correspondenciaItemSchema = z.object({
  remetenteId: z.string().min(1, "Selecione o remetente"),
  quantidade: z
    .number()
    .int("Quantidade deve ser um número inteiro")
    .min(1, "Quantidade mínima é 1")
    .max(999, "Quantidade máxima é 999"),
  codigoRastreio: z.string().trim().max(60).optional(),
  // Mesma coluna nota_fiscal da tabela encomendas (correspondencia = tipo "carta").
  notaFiscal: z.string().trim().max(60).optional(),
})

const correspondenciaBaseSchema = z.object({
  moradorId: z.string().min(1, "Selecione o morador"),
  rua: z.string().trim().min(1, "Informe a rua").max(120),
  numero: z.string().trim().min(1, "Informe o número").max(20),
  observacoes: z.string().trim().max(500).optional(),
})

/** Cadastro: regra fixa de NF ou rastreio obrigatorio (ver identificacao.ts). */
export const correspondenciaCreateSchema = correspondenciaBaseSchema
  .extend(correspondenciaItemSchema.shape)
  .superRefine((data, ctx) => exigirIdentificacao(data, ctx))

/** Adicionar um item novo a uma correspondencia pendente ja existente. */
export const correspondenciaAddItemSchema = correspondenciaItemSchema.superRefine(
  (data, ctx) => exigirIdentificacao(data, ctx)
)

/**
 * Edicao de uma correspondencia ja existente. Sem a regra de identificacao
 * (registros legados continuam editaveis) — ver
 * `correspondenciaUpdateComIdentificacaoSchema` e a checagem na action.
 */
export const correspondenciaUpdateSchema = correspondenciaBaseSchema.extend(
  correspondenciaItemSchema.shape
)

/** Edicao de registro que ja tinha NF ou rastreio: continua exigindo um dos dois. */
export const correspondenciaUpdateComIdentificacaoSchema =
  correspondenciaUpdateSchema.superRefine((data, ctx) => exigirIdentificacao(data, ctx))

export type CorrespondenciaCreateInput = z.infer<
  typeof correspondenciaCreateSchema
>
export type CorrespondenciaAddItemInput = z.infer<
  typeof correspondenciaAddItemSchema
>
export type CorrespondenciaUpdateInput = z.infer<
  typeof correspondenciaUpdateSchema
>

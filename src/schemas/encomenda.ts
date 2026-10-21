import { z } from "zod"

import { TIPO_ENCOMENDA_VALUES, TRANSPORTADORA_VALUES } from "@/lib/labels"

import { exigirIdentificacao } from "./identificacao"

/**
 * Transportadora/rastreio/NF sao por item (nao mais compartilhados por todo
 * o lote) — encomendas registradas juntas podem vir de transportadoras
 * diferentes (ex: 1 caixa dos Correios + 1 pacote da Amazon no mesmo lote).
 */
const encomendaItemSchema = z.object({
  tipo: z.enum(TIPO_ENCOMENDA_VALUES),
  quantidade: z
    .number()
    .int("Quantidade deve ser um número inteiro")
    .min(1, "Quantidade mínima é 1")
    .max(999, "Quantidade máxima é 999"),
  transportadora: z.enum(TRANSPORTADORA_VALUES),
  transportadoraOutro: z.string().trim().max(60).optional(),
  codigoRastreio: z.string().trim().max(60).optional(),
  notaFiscal: z.string().trim().max(60).optional(),
})

const encomendaBaseSchema = z.object({
  moradorId: z.string().min(1, "Selecione o morador"),
  rua: z.string().trim().min(1, "Informe a rua").max(120),
  numero: z.string().trim().min(1, "Informe o número").max(20),
  observacoes: z.string().trim().max(500).optional(),
})

/** Cadastro de uma nova encomenda: varios itens (tipo/transportadora/quantidade/rastreio proprios) numa mesma submissao. */
export const encomendaCreateSchema = encomendaBaseSchema
  .extend({
    itens: z
      .array(encomendaItemSchema)
      .min(1, "Adicione pelo menos um item"),
  })
  .superRefine((data, ctx) => {
    data.itens.forEach((item, index) => {
      if (item.transportadora === "outros" && !item.transportadoraOutro?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe o nome da transportadora",
          path: ["itens", index, "transportadoraOutro"],
        })
      }
      // Regra fixa: cada item precisa de NF ou rastreio (ver identificacao.ts).
      exigirIdentificacao(item, ctx, ["itens", index])
    })
  })

/**
 * Edicao de uma encomenda ja existente: cada registro continua sendo um item
 * unico. NAO exige NF/rastreio — registros legados sem nenhum dos dois
 * continuam editaveis. Quando o registro original ja tinha identificacao, o
 * formulario usa `encomendaUpdateComIdentificacaoSchema` e a action confere
 * contra o banco (nao deixa "esvaziar" os dois campos).
 */
export const encomendaUpdateSchema = encomendaBaseSchema
  .extend(encomendaItemSchema.shape)
  .refine(
    (data) => data.transportadora !== "outros" || !!data.transportadoraOutro?.trim(),
    { message: "Informe o nome da transportadora", path: ["transportadoraOutro"] }
  )

/** Edicao de registro que ja tinha NF ou rastreio: continua exigindo um dos dois. */
export const encomendaUpdateComIdentificacaoSchema = encomendaUpdateSchema.superRefine(
  (data, ctx) => exigirIdentificacao(data, ctx)
)

/** Adicionar um item novo a um lote pendente ja existente. */
export const encomendaAddItemSchema = encomendaItemSchema
  .extend({ observacoes: z.string().trim().max(500).optional() })
  .refine(
    (data) => data.transportadora !== "outros" || !!data.transportadoraOutro?.trim(),
    { message: "Informe o nome da transportadora", path: ["transportadoraOutro"] }
  )
  .superRefine((data, ctx) => exigirIdentificacao(data, ctx))

export type EncomendaCreateInput = z.infer<typeof encomendaCreateSchema>
export type EncomendaUpdateInput = z.infer<typeof encomendaUpdateSchema>
export type EncomendaAddItemInput = z.infer<typeof encomendaAddItemSchema>

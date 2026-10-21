import { z } from "zod"

import { TRANSPORTADORA_VALUES } from "@/lib/labels"
import { TRANSPORTADORA_NOME_MAX } from "@/lib/transportadoras"

/**
 * Validacao dos parametros "primitivos" (id, nome, offset, categoria...) que
 * as server actions recebem direto do cliente, fora dos formularios. Server
 * actions sao endpoints publicos: o TypeScript nao garante nada em runtime,
 * entao qualquer valor pode chegar aqui (objeto no lugar de string, string
 * gigante, uuid malformado que estoura 22P02 no Postgres e vira 500...).
 *
 * Sem .transform()/z.coerce de proposito (mesma regra dos schemas de
 * formulario) — o trim fica a cargo de quem chama, como ja era antes.
 *
 * z.guid() (formato 8-4-4-4-12 hex, sem exigir versao/variante RFC) em vez de
 * z.uuid(): no zod 4 o z.uuid() rejeita ids validos para o Postgres que nao
 * sejam RFC 9562 (ex.: ids fixos de seed como 00000000-...-0001).
 */
export const idParamSchema = z.guid()

export const encomendaCategoriaParamSchema = z.enum(["encomenda", "correspondencia"])

export const offsetParamSchema = z.number().int().min(0).max(100_000)

/** Nome de quem retirou: obrigatoriedade continua sendo checada pela action. */
export const retiradoPorParamSchema = z.string().max(120)

export const searchTermParamSchema = z.string().max(120)

export const desdeParamSchema = z.date().optional()

export const remetenteNomeParamSchema = z.string().max(120)

/**
 * Nome de transportadora personalizada. Dois passos (sem .transform()):
 * o valor bruto só precisa ser string de tamanho razoável; a action
 * normaliza (normalizarNomeTransportadora) e valida o resultado com
 * `transportadoraNomeParamSchema` (1..60, igual ao CHECK do banco).
 */
export const transportadoraNomeBrutoParamSchema = z.string().max(200)

export const transportadoraNomeParamSchema = z
  .string()
  .min(1, "Informe o nome da transportadora.")
  .max(
    TRANSPORTADORA_NOME_MAX,
    `Nome da transportadora muito longo (máximo de ${TRANSPORTADORA_NOME_MAX} caracteres).`
  )

/**
 * Filtros do relatório. Transportadora pode ser fixa (enum) ou personalizada
 * (`transportadoraOutro`, que implica transportadora = 'outros' e compara
 * lower(transportadora_outro) = lower(nome)).
 */
export const reportFiltersParamSchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  transportadora: z.enum(TRANSPORTADORA_VALUES).optional(),
  transportadoraOutro: z.string().min(1).max(TRANSPORTADORA_NOME_MAX).optional(),
  moradorId: z.guid().optional(),
  status: z.enum(["pendente", "entregue"]).optional(),
})

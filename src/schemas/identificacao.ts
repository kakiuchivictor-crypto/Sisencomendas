import type { z } from "zod"

/**
 * Regra fixa de negocio: todo item cadastrado (encomenda ou correspondencia)
 * precisa ter nota fiscal OU codigo de rastreio — item sem nenhum dado de
 * identificacao so ocupa espaco e nao ajuda a localizar o pacote depois.
 *
 * Usado no cliente (superRefine dos schemas dos formularios) e no servidor
 * (mesmos schemas nas actions + checagem contra o registro original na
 * edicao). Nao usa .transform(): so le os valores ja aparados pelo .trim().
 */

export const IDENTIFICACAO_OBRIGATORIA_MENSAGEM =
  "Informe a nota fiscal ou o código de rastreio."

/** Marca o issue para as actions conseguirem devolver a mensagem especifica. */
const IDENTIFICACAO_PARAM = "identificacao"

type ItemIdentificavel = {
  codigoRastreio?: string | null
  notaFiscal?: string | null
}

/** true se o item tem nota fiscal ou codigo de rastreio nao vazio (apos trim). */
export function temIdentificacao(item: ItemIdentificavel): boolean {
  return Boolean(item.codigoRastreio?.trim() || item.notaFiscal?.trim())
}

/**
 * Adiciona o erro no campo de rastreio do item (path relativo ao schema que
 * chamou o superRefine) quando faltam os dois campos.
 */
export function exigirIdentificacao(
  item: ItemIdentificavel,
  ctx: Pick<z.core.$RefinementCtx, "addIssue">,
  basePath: (string | number)[] = []
) {
  if (temIdentificacao(item)) return

  ctx.addIssue({
    code: "custom",
    message: IDENTIFICACAO_OBRIGATORIA_MENSAGEM,
    path: [...basePath, "codigoRastreio"],
    params: { [IDENTIFICACAO_PARAM]: true },
  })
}

/**
 * Mensagem amigavel para a action devolver quando o parse falhou por falta
 * de identificacao. Em lotes com varios itens indica qual ("Item 2: ...").
 * Retorna null se o erro foi outro.
 */
export function mensagemErroIdentificacao(error: z.ZodError): string | null {
  const issue = error.issues.find(
    (current) =>
      current.code === "custom" && current.params?.[IDENTIFICACAO_PARAM] === true
  )

  if (!issue) return null

  const itemIndex =
    issue.path[0] === "itens" && typeof issue.path[1] === "number"
      ? issue.path[1]
      : null

  return itemIndex === null
    ? IDENTIFICACAO_OBRIGATORIA_MENSAGEM
    : `Item ${itemIndex + 1}: informe a nota fiscal ou o código de rastreio.`
}

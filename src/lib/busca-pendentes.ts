/**
 * Busca client-side das listas de pendentes (Pendentes e Correspondência):
 * casa o termo com o nome do morador, a rua e o número do endereço.
 *
 * - Ignora maiúsculas/minúsculas e acentos ("acacias" acha "Acácias").
 * - O termo é quebrado em palavras (espaço ou vírgula) e TODAS precisam
 *   aparecer em algum dos campos — assim "Acácias 142", "142", "Maria 142"
 *   ou "acacias, 142" funcionam, sem depender da ordem.
 */

type PendenteBuscavel = {
  moradorNome: string
  rua: string
  numero: string
}

/** Minúsculas + remove acentos (NFD separa as marcas diacríticas). */
export function normalizarTextoBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
}

/** Palavras normalizadas do termo digitado (vazio = sem filtro). */
export function termosDaBusca(busca: string): string[] {
  return normalizarTextoBusca(busca)
    .split(/[\s,]+/)
    .filter(Boolean)
}

export function pendenteCasaBusca(item: PendenteBuscavel, termos: string[]): boolean {
  if (termos.length === 0) return true

  const alvo = normalizarTextoBusca(`${item.moradorNome} ${item.rua} ${item.numero}`)

  return termos.every((termo) => alvo.includes(termo))
}

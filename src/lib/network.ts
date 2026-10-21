/**
 * Server Actions falham lançando (fetch de rede) quando o dispositivo está
 * offline, em vez de retornar `{ success: false }` como nos erros esperados
 * de validação/regra de negocio — sem tratamento especifico, isso vira uma
 * excecao nao capturada (tela "trava" sem feedback nenhum pro usuario).
 */
export function offlineAwareErrorMessage(fallback: string): string {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "Sem conexão com a internet. Tente novamente quando a conexão voltar."
  }
  return fallback
}

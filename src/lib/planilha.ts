/**
 * Neutraliza injeção de fórmula (CSV/Excel injection): um texto livre que
 * começa com =, +, -, @, tab ou CR seria interpretado como fórmula pelo
 * Excel/LibreOffice ao abrir a planilha (ex.: transportadora "=HYPERLINK(...)").
 * O prefixo ' força a célula a ser texto. Usar só em valores de texto vindos
 * do usuário (nomes, transportadora personalizada, observações...) — nunca
 * em números/datas nem nos marcadores fixos como "-".
 */
export function neutralizarFormula(valor: string): string {
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor
}

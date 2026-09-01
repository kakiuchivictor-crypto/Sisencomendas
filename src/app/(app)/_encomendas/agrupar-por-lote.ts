import type { EncomendaComDetalhes } from "@/types/domain"

export type LoteEncomendas = {
  loteId: string
  itens: EncomendaComDetalhes[]
}

/**
 * Agrupa itens que pertencem ao mesmo lote (mesmo loteId) — normalmente
 * cadastrados juntos na mesma submissao, mas um item pode ter sido
 * adicionado depois a um lote pendente ja existente (ver "Adicionar item"),
 * com seu proprio recebidaEm/recebidaPor. A ordem original da lista e
 * mantida — como as queries ordenam por recebidaEm crescente, o primeiro
 * item de cada lote aqui e sempre o mais antigo.
 */
export function agruparPorLote(lista: EncomendaComDetalhes[]): LoteEncomendas[] {
  const grupos = new Map<string, EncomendaComDetalhes[]>()

  for (const encomenda of lista) {
    const itens = grupos.get(encomenda.loteId)
    if (itens) {
      itens.push(encomenda)
    } else {
      grupos.set(encomenda.loteId, [encomenda])
    }
  }

  return Array.from(grupos.entries()).map(([loteId, itens]) => ({ loteId, itens }))
}

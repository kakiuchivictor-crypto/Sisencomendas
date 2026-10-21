import {
  TRANSPORTADORA_LABELS,
  TRANSPORTADORA_VALUES,
  type Transportadora,
  type TransportadoraFixa,
} from "@/lib/labels"

/**
 * Regras puras (sem banco, usadas no cliente e no servidor) do catálogo de
 * transportadoras personalizadas. Encomendas continuam gravando
 * transportadora = 'outros' + transportadora_outro = nome; o catálogo
 * (sisencomendas.transportadoras) só guarda os nomes já digitados.
 */

/** Mesmo limite do CHECK transportadoras_nome_valido e do transportadoraOutro (max 60). */
export const TRANSPORTADORA_NOME_MAX = 60

/** Teto anti-abuso de nomes cadastrados por condomínio. */
export const TRANSPORTADORAS_TETO_POR_CONDOMINIO = 200

/** Chave do TanStack Query do catálogo (combobox e filtro de relatórios). */
export const TRANSPORTADORAS_QUERY_KEY = ["transportadoras"] as const

/** Limite defensivo da listagem do catálogo. */
export const TRANSPORTADORAS_LIST_LIMIT = 500

/**
 * Colapsa qualquer espaço em branco (tab, quebra de linha, NBSP...) em um
 * espaço simples e apara as pontas. Necessário porque o CHECK do banco usa
 * btrim(), que só remove o caractere espaço: um tab na ponta violaria o CHECK.
 */
export function normalizarNomeTransportadora(nome: string): string {
  return nome.replace(/\s+/g, " ").trim()
}

/** Chave de comparação case/acento-insensitive ("Jadlóg " === "jadlog"). */
export function chaveTransportadora(nome: string): string {
  return normalizarNomeTransportadora(nome)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
}

const FIXA_POR_CHAVE = new Map<string, Transportadora>(
  TRANSPORTADORA_VALUES.map((value) => [
    chaveTransportadora(TRANSPORTADORA_LABELS[value]),
    value,
  ])
)

/**
 * Valor do enum cujo rótulo fixo coincide com o nome (case/acento-insensitive).
 * Inclui "outros" — quem chama decide o que fazer com o curinga.
 */
export function casarTransportadoraFixa(nome: string): Transportadora | null {
  return FIXA_POR_CHAVE.get(chaveTransportadora(nome)) ?? null
}

/** Opção escolhida no combobox. */
export type SelecaoTransportadora =
  | { tipo: "fixa"; valor: TransportadoraFixa }
  | { tipo: "personalizada"; nome: string }

/** Campos do formulário (mesmos nomes do schema de encomenda). */
export type CamposTransportadora = {
  transportadora: Transportadora
  transportadoraOutro: string
}

export function selecaoParaCampos(selecao: SelecaoTransportadora): CamposTransportadora {
  return selecao.tipo === "fixa"
    ? { transportadora: selecao.valor, transportadoraOutro: "" }
    : { transportadora: "outros", transportadoraOutro: selecao.nome }
}

/**
 * Texto exibido no gatilho do combobox a partir dos campos do formulário.
 * Registros legados com 'outros' + nome fora do catálogo continuam
 * mostrando o nome digitado; 'outros' sem nome mostra vazio (placeholder).
 */
export function rotuloCamposTransportadora(campos: {
  transportadora: Transportadora | null | undefined
  transportadoraOutro: string | null | undefined
}): string {
  if (!campos.transportadora) return ""
  if (campos.transportadora === "outros") {
    return normalizarNomeTransportadora(campos.transportadoraOutro ?? "")
  }
  return TRANSPORTADORA_LABELS[campos.transportadora]
}

/**
 * O termo digitado já corresponde a alguma opção existente (fixa, inclusive
 * "Outros", ou cadastrada)? Usado para esconder "Adicionar transportadora".
 */
export function termoJaExiste(termo: string, nomesCadastrados: readonly string[]): boolean {
  const chave = chaveTransportadora(termo)
  if (!chave) return true
  if (FIXA_POR_CHAVE.has(chave)) return true
  return nomesCadastrados.some((nome) => chaveTransportadora(nome) === chave)
}

/**
 * Valor do Select de transportadora do relatório: "todas", uma fixa
 * ("fixa:amazon", inclusive "fixa:outros" = todas as personalizadas) ou um
 * nome do catálogo ("nome:J&T").
 */
export type FiltroTransportadoraValor = "todas" | `fixa:${Transportadora}` | `nome:${string}`

export function filtroTransportadoraParaParams(valor: string): {
  transportadora?: Transportadora
  transportadoraOutro?: string
} {
  if (valor.startsWith("fixa:")) {
    const fixa = valor.slice("fixa:".length)
    return (TRANSPORTADORA_VALUES as readonly string[]).includes(fixa)
      ? { transportadora: fixa as Transportadora }
      : {}
  }
  if (valor.startsWith("nome:")) {
    const nome = normalizarNomeTransportadora(valor.slice("nome:".length))
    return nome ? { transportadora: "outros", transportadoraOutro: nome } : {}
  }
  return {}
}

export const TRANSPORTADORA_VALUES = [
  "correios",
  "mercado_livre",
  "amazon",
  "shopee",
  "jadlog",
  "loggi",
  "total_express",
  "fedex",
  "ups",
  "dhl",
  "outros",
] as const

export const TIPO_ENCOMENDA_VALUES = [
  "caixa",
  "pacote",
  "envelope",
  "documento",
  "medicamento",
  "carta",
  "outros",
] as const

export type Transportadora = (typeof TRANSPORTADORA_VALUES)[number]
export type TipoEncomenda = (typeof TIPO_ENCOMENDA_VALUES)[number]

export const TRANSPORTADORA_LABELS: Record<Transportadora, string> = {
  correios: "Correios",
  mercado_livre: "Mercado Livre",
  amazon: "Amazon",
  shopee: "Shopee",
  jadlog: "Jadlog",
  loggi: "Loggi",
  total_express: "Total Express",
  fedex: "FedEx",
  ups: "UPS",
  dhl: "DHL",
  outros: "Outros",
}

export const TIPO_ENCOMENDA_LABELS: Record<TipoEncomenda, string> = {
  caixa: "Caixa",
  pacote: "Pacote",
  envelope: "Envelope",
  documento: "Documento",
  medicamento: "Medicamento",
  carta: "Carta",
  outros: "Outros",
}

export const TRANSPORTADORA_OPTIONS = TRANSPORTADORA_VALUES.map((value) => ({
  value,
  label: TRANSPORTADORA_LABELS[value],
}))

/** Transportadora fixa "de verdade" (tudo menos o curinga "outros"). */
export type TransportadoraFixa = Exclude<Transportadora, "outros">

/**
 * Fixas sem "Outros": no combobox, "Outros" deixa de ser opção — nomes
 * personalizados vêm do catálogo do condomínio (ver lib/transportadoras.ts).
 */
export const TRANSPORTADORA_FIXA_OPTIONS = TRANSPORTADORA_OPTIONS.filter(
  (option): option is { value: TransportadoraFixa; label: string } =>
    option.value !== "outros"
)

export const TRANSPORTADORA_COMBOBOX_LABELS = {
  placeholder: "Selecione a transportadora...",
  buscar: "Buscar ou cadastrar transportadora...",
  vazio: "Nenhuma transportadora encontrada.",
  grupoFixas: "Principais",
  grupoCadastradas: "Cadastradas no condomínio",
  /** Filtro de relatório: "outros" = qualquer transportadora personalizada. */
  filtroOutras: "Outras (todas as personalizadas)",
  adicionar: (nome: string) => `Adicionar transportadora “${nome}”`,
} as const

/** Nula pra "carta" (correspondencia usa remetente em vez de transportadora). */
export function transportadoraLabel(
  transportadora: Transportadora | null,
  transportadoraOutro: string | null
): string {
  if (!transportadora) return "-"
  if (transportadora === "outros" && transportadoraOutro) return transportadoraOutro
  return TRANSPORTADORA_LABELS[transportadora]
}

export const TIPO_ENCOMENDA_OPTIONS = TIPO_ENCOMENDA_VALUES.map((value) => ({
  value,
  label: TIPO_ENCOMENDA_LABELS[value],
}))

/**
 * "Carta" fica de fora do formulario de Nova Encomenda: tem seu proprio
 * menu/fluxo (Correspondencia), entao nao deve aparecer como opcao ali.
 */
export const TIPO_ENCOMENDA_OPTIONS_SEM_CARTA = TIPO_ENCOMENDA_OPTIONS.filter(
  (option) => option.value !== "carta"
)

/** Rotulos/dica dos campos de identificacao do item (regra em schemas/identificacao.ts). */
export const IDENTIFICACAO_LABELS = {
  codigoRastreio: "Código de rastreio",
  notaFiscal: "Nota fiscal",
  dica: "Preencha pelo menos um: nota fiscal ou rastreio.",
} as const

/**
 * "desenvolvedor" e o nome interno (banco/codigo) do antigo "admin" — so o
 * rotulo mudou. "administracao" e a nova funcao: tem quase as mesmas
 * permissoes, exceto gerenciar usuarios e configuracoes (ver isAdminLike vs.
 * checagens estritas de "desenvolvedor" nas actions).
 */
export const USUARIO_ROLE_VALUES = [
  "desenvolvedor",
  "administracao",
  "porteiro",
] as const

export type UsuarioRole = (typeof USUARIO_ROLE_VALUES)[number]

export const USUARIO_ROLE_LABELS: Record<UsuarioRole, string> = {
  desenvolvedor: "Desenvolvedor",
  administracao: "Administração",
  porteiro: "Porteiro",
}

export const USUARIO_ROLE_OPTIONS = USUARIO_ROLE_VALUES.map((value) => ({
  value,
  label: USUARIO_ROLE_LABELS[value],
}))

/** Acesso amplo (moradores, relatorios etc.) — tudo exceto usuarios/configuracoes. */
export function isAdminLike(role: UsuarioRole): boolean {
  return role === "desenvolvedor" || role === "administracao"
}

export const LOG_ACAO_VALUES = [
  "encomenda_criada",
  "encomenda_entregue",
  "encomenda_revertida",
  "encomenda_excluida",
  "item_adicionado_lote",
  "correspondencia_criada",
  "morador_criado",
  "morador_atualizado",
  "morador_excluido",
  "usuario_criado",
  "usuario_atualizado",
  "usuario_excluido",
  "configuracoes_atualizadas",
  "encomenda_deixada_portaria",
  "encomenda_retirada_portaria",
] as const

export type LogAcao = (typeof LOG_ACAO_VALUES)[number]

export const LOG_ACAO_LABELS: Record<LogAcao, string> = {
  encomenda_criada: "Encomenda registrada",
  encomenda_entregue: "Encomenda entregue",
  encomenda_revertida: "Entrega revertida",
  encomenda_excluida: "Encomenda excluida",
  item_adicionado_lote: "Item adicionado",
  correspondencia_criada: "Correspondencia registrada",
  morador_criado: "Morador cadastrado",
  morador_atualizado: "Morador atualizado",
  morador_excluido: "Morador excluido",
  usuario_criado: "Usuario cadastrado",
  usuario_atualizado: "Usuario atualizado",
  usuario_excluido: "Usuario excluido",
  configuracoes_atualizadas: "Configuracoes atualizadas",
  encomenda_deixada_portaria: "Marcada como deixada na portaria",
  encomenda_retirada_portaria: "Desmarcada da portaria",
}

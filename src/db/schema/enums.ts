import { sisencomendasSchema } from "./namespace"

export const usuarioRoleEnum = sisencomendasSchema.enum("usuario_role", [
  "desenvolvedor",
  "administracao",
  "porteiro",
])

export const encomendaStatusEnum = sisencomendasSchema.enum("encomenda_status", [
  "pendente",
  "entregue",
])

export const transportadoraEnum = sisencomendasSchema.enum("transportadora", [
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
])

export const tipoEncomendaEnum = sisencomendasSchema.enum("tipo_encomenda", [
  "caixa",
  "pacote",
  "envelope",
  "documento",
  "medicamento",
  "carta",
  "outros",
])

export const temaEnum = sisencomendasSchema.enum("tema", ["claro", "escuro"])

export const logAcaoEnum = sisencomendasSchema.enum("log_acao", [
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
])

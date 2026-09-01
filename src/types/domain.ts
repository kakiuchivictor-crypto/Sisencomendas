import type {
  condominios,
  encomendaStatusEnum,
  encomendas,
  logAcaoEnum,
  logAtividade,
  moradores,
  remetentes,
  temaEnum,
  usuarios,
} from "@/db/schema"
import type { TipoEncomenda, Transportadora, UsuarioRole } from "@/lib/labels"

export type Condominio = typeof condominios.$inferSelect
export type Usuario = typeof usuarios.$inferSelect
export type Morador = typeof moradores.$inferSelect
export type Encomenda = typeof encomendas.$inferSelect
export type LogAtividade = typeof logAtividade.$inferSelect
export type Remetente = typeof remetentes.$inferSelect

export type { TipoEncomenda, Transportadora, UsuarioRole }
export type EncomendaStatus = (typeof encomendaStatusEnum.enumValues)[number]
export type Tema = (typeof temaEnum.enumValues)[number]
export type LogAcao = (typeof logAcaoEnum.enumValues)[number]

export type UsuarioComEmail = {
  id: string
  nome: string
  role: UsuarioRole
  email: string
  createdAt: Date
}

export type EncomendaComDetalhes = {
  id: string
  loteId: string
  moradorId: string
  moradorNome: string
  rua: string
  numero: string
  transportadora: Transportadora | null
  transportadoraOutro: string | null
  remetenteId: string | null
  remetenteNome: string | null
  tipo: TipoEncomenda
  quantidade: number
  codigoRastreio: string | null
  notaFiscal: string | null
  observacoes: string | null
  status: EncomendaStatus
  recebidaPorNome: string
  recebidaEm: Date
  entreguePorNome: string | null
  entregueEm: Date | null
  retiradoPor: string | null
  deixadoPortariaPor: string | null
  deixadoPortariaNome: string | null
  deixadoPortariaEm: Date | null
}

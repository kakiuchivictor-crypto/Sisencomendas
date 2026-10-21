"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Ellipsis,
  Flag,
  Package,
  PackagePlus,
  Pencil,
  Search,
  type LucideIcon,
} from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { pendenteCasaBusca, termosDaBusca } from "@/lib/busca-pendentes"
import { diasDesde, formatDate, formatDurationSince, formatTime } from "@/lib/format"
import { TIPO_ENCOMENDA_LABELS, transportadoraLabel } from "@/lib/labels"
import { offlineAwareErrorMessage } from "@/lib/network"
import { cn } from "@/lib/utils"
import type { EncomendaCategoria } from "@/repositories/encomenda-repository"
import type { EncomendaComDetalhes } from "@/types/domain"

import { AdicionarItemDialog } from "./adicionar-item-dialog"
import { agruparPorLote } from "./agrupar-por-lote"
import {
  entregarAction,
  entregarItemAction,
  listPendentesAction,
  toggleDeixadoPortariaAction,
} from "./actions"
import { EncomendaFormDialog } from "./encomenda-form-dialog"
import { NovaEncomendaButton } from "./nova-encomenda-button"
import { PendentesSearchInput } from "./pendentes-search-input"
import { CorrespondenciaFormDialog } from "../correspondencia/correspondencia-form-dialog"
import { NovaCorrespondenciaButton } from "../correspondencia/nova-correspondencia-button"

const DIAS_ATRASO = 7

export type PendentesFiltro = "todas" | "atrasadas" | "portaria" | "lotes"

const FILTROS: { value: PendentesFiltro; label: string; icon?: LucideIcon }[] = [
  { value: "todas", label: "Todas" },
  { value: "atrasadas", label: `Mais de ${DIAS_ATRASO} dias`, icon: AlertTriangle },
  { value: "portaria", label: "Na portaria", icon: Flag },
  { value: "lotes", label: "Lotes" },
]

/** Colunas da linha a partir de md: morador | origem e itens | recebida | acoes.
 * A ultima trilha e fixa (e nao `auto`) para o cabecalho medir igual as linhas;
 * 14rem cabe 2 botoes de 44px + "Entregar ▾" mesmo com pointer-coarse. */
const ROW_GRID =
  "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_7.5rem_14rem] md:gap-4 md:pr-4 md:pl-5"

function estaAtrasada(encomenda: EncomendaComDetalhes): boolean {
  return diasDesde(encomenda.recebidaEm) >= DIAS_ATRASO
}

/** "MA" para "Mariana Albuquerque" — so decorativo (aria-hidden). */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  const primeira = partes[0]?.[0] ?? ""
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : ""
  return (primeira + ultima).toLocaleUpperCase("pt-BR")
}

/** So o horario quando foi hoje; "dd/mm HH:mm" quando foi em outro dia. */
function formatRecebida(date: Date | string): string {
  const recebida = new Date(date)
  if (recebida.toDateString() === new Date().toDateString()) {
    return formatTime(recebida)
  }
  return `${formatDate(recebida).slice(0, 5)} ${formatTime(recebida)}`
}

function itensLabel(itens: EncomendaComDetalhes[]): string {
  return itens
    .map((item) => {
      const label = TIPO_ENCOMENDA_LABELS[item.tipo]
      return item.quantidade > 1 ? `${label} ×${item.quantidade}` : label
    })
    .join(", ")
}

/** Rastreio/NF do item, quando existirem — usado pra distinguir itens do
 * mesmo tipo num lote na hora de escolher qual entregar parcialmente. */
function itemIdentificacao(item: EncomendaComDetalhes): string | null {
  const partes: string[] = []
  if (item.codigoRastreio) partes.push(`Rastreio ${item.codigoRastreio}`)
  if (item.notaFiscal) partes.push(`NF ${item.notaFiscal}`)
  return partes.length > 0 ? partes.join(" · ") : null
}

/** Transportadora (com nome personalizado) ou, na correspondencia, o remetente. */
function origemDoItem(item: EncomendaComDetalhes): string {
  return item.remetenteNome ?? transportadoraLabel(item.transportadora, item.transportadoraOutro)
}

/** Texto do dialogo de entrega: total, morador e endereco. */
function descricaoEntrega(itens: EncomendaComDetalhes[], partial: boolean): string {
  const primeiro = itens[0]
  if (!primeiro) return ""
  const total = itens.length === 1 ? "1 item" : `${itens.length} itens`
  const destino = `${primeiro.moradorNome} (${primeiro.rua}, ${primeiro.numero})`
  return partial
    ? `Entrega parcial de ${total} para ${destino}. O restante do lote continua pendente.`
    : `Entrega de ${total} para ${destino}.`
}

export function PendentesList({
  initialPendentes,
  categoria = "encomenda",
  allowEdit = true,
  busca: buscaControlada,
  onBuscaChange,
  filtro = "todas",
  onFiltroChange,
  canManagePortaria = false,
}: {
  initialPendentes: EncomendaComDetalhes[]
  categoria?: EncomendaCategoria
  allowEdit?: boolean
  /** Quando informado (junto com onBuscaChange), o campo de busca proprio fica
   * escondido e a lista passa a filtrar pelo valor controlado de fora — usado
   * quando a busca precisa aparecer em outro lugar da tela (ex: ao lado do
   * botao "Nova encomenda"). Sem esses props, o componente usa seu proprio
   * campo de busca interno normalmente. */
  busca?: string
  onBuscaChange?: (value: string) => void
  /** Filtro rapido (chips + indicador "Mais de 7 dias") — soma-se à busca por morador/rua. */
  filtro?: PendentesFiltro
  /** Quando informado, os chips de filtro aparecem acima da lista. */
  onFiltroChange?: (filtro: PendentesFiltro) => void
  /** So administracao/desenvolvedor podem ativar/desativar o sinalizador de portaria. */
  canManagePortaria?: boolean
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<EncomendaComDetalhes | null>(null)
  const [addingItemLoteId, setAddingItemLoteId] = useState<string | null>(null)
  const [togglingPortariaLoteId, setTogglingPortariaLoteId] = useState<string | null>(
    null
  )
  const [, startTogglePortariaTransition] = useTransition()
  const [entregando, setEntregando] = useState<{
    id: string
    /** Entrega so este item (id), deixando o resto do lote pendente. */
    partial: boolean
    /** Copia dos itens que serao entregues (o lote inteiro, ou so o item no
     * parcial), tirada da lista ja carregada: o dialogo continua mostrando os
     * dados mesmo depois que o update otimista remove o lote da lista. */
    itens: EncomendaComDetalhes[]
  } | null>(null)
  const [retiradoPor, setRetiradoPor] = useState("")
  const [buscaInterna, setBuscaInterna] = useState("")
  const isControlled = buscaControlada !== undefined && onBuscaChange !== undefined
  const busca = isControlled ? buscaControlada : buscaInterna
  const setBusca = isControlled ? onBuscaChange : setBuscaInterna
  const queryKey = ["encomendas-pendentes", categoria]

  const { data: pendentes } = useQuery({
    queryKey,
    queryFn: () => listPendentesAction(categoria),
    initialData: initialPendentes,
    // Rede de seguranca para o destaque de atraso (>7 dias), que muda
    // sozinho com o tempo — o Realtime so avisa de escritas no banco.
    refetchInterval: 5 * 60 * 1000,
  })

  const entregarMutation = useMutation({
    mutationFn: ({
      id,
      retiradoPor,
      partial,
    }: {
      id: string
      retiradoPor: string
      partial: boolean
    }) => (partial ? entregarItemAction(id, retiradoPor) : entregarAction(id, retiradoPor)),
    onMutate: async ({ id, partial }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<EncomendaComDetalhes[]>(queryKey)
      const loteId = previous?.find((item) => item.id === id)?.loteId
      queryClient.setQueryData<EncomendaComDetalhes[]>(queryKey, (current) =>
        current?.filter((item) =>
          partial ? item.id !== id : !loteId || item.loteId !== loteId
        )
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
      toast.error(offlineAwareErrorMessage("Não foi possível registrar a entrega."))
    },
    onSuccess: (result, _variables, context) => {
      if (!result.success) {
        if (context?.previous) {
          queryClient.setQueryData(queryKey, context.previous)
        }
        toast.error(result.error)
        return
      }
      toast.success("Entrega registrada.")
      setEntregando(null)
      setRetiradoPor("")
      void queryClient.invalidateQueries({ queryKey: ["cards-stats", categoria] })
      void queryClient.invalidateQueries({ queryKey: ["nav-counts"] })
      void queryClient.invalidateQueries({
        queryKey: ["encomendas-entregues", categoria],
      })
      // "encomendas-historico" nao tem categoria na chave (busca so encomendas
      // normais) — invalidar sem o segundo elemento pega qualquer termo de busca.
      void queryClient.invalidateQueries({ queryKey: ["encomendas-historico"] })
    },
  })

  function handleConfirmarEntrega() {
    if (!entregando) return
    entregarMutation.mutate({
      id: entregando.id,
      retiradoPor: retiradoPor.trim(),
      partial: entregando.partial,
    })
  }

  function handleTogglePortaria(loteId: string, ativo: boolean) {
    setTogglingPortariaLoteId(loteId)
    startTogglePortariaTransition(async () => {
      try {
        const result = await toggleDeixadoPortariaAction(loteId, ativo)

        if (!result.success) {
          toast.error(result.error)
          return
        }

        void queryClient.invalidateQueries({ queryKey })
      } catch {
        toast.error(offlineAwareErrorMessage("Não foi possível atualizar a portaria."))
      } finally {
        setTogglingPortariaLoteId(null)
      }
    })
  }

  const list = pendentes ?? []

  // Nome do morador, rua e número; sem diferenciar maiúsculas nem acentos.
  const termosBusca = termosDaBusca(busca)
  const listaBuscada = list.filter((encomenda) =>
    pendenteCasaBusca(encomenda, termosBusca)
  )
  const lotesBuscados = agruparPorLote(listaBuscada)

  // Contadores dos chips: itens (batem com os indicadores do topo), exceto
  // "Lotes", que conta os lotes com mais de um item.
  const contagemFiltros: Record<PendentesFiltro, number> = {
    todas: listaBuscada.length,
    atrasadas: listaBuscada.filter(estaAtrasada).length,
    portaria: listaBuscada.filter((item) => item.deixadoPortariaPor).length,
    lotes: lotesBuscados.filter((lote) => lote.itens.length > 1).length,
  }

  if (list.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16">
        <Package className="size-8" />
        <p>
          {categoria === "correspondencia"
            ? "Nenhuma correspondência pendente."
            : "Nenhuma encomenda pendente."}
        </p>
        {categoria === "correspondencia" ? (
          <NovaCorrespondenciaButton />
        ) : (
          <NovaEncomendaButton />
        )}
      </div>
    )
  }

  const lotes =
    filtro === "atrasadas"
      ? // Filtro por item (como antes): num lote com item adicionado depois,
        // so os itens antigos aparecem.
        agruparPorLote(listaBuscada.filter(estaAtrasada))
      : lotesBuscados.filter(({ itens }) => {
          if (filtro === "portaria") return Boolean(itens[0]?.deixadoPortariaPor)
          if (filtro === "lotes") return itens.length > 1
          return true
        })

  const emptyMessage = busca
    ? `Nenhum morador ou rua encontrado para "${busca}".`
    : filtro === "atrasadas"
      ? "Nenhuma encomenda atrasada no momento."
      : filtro === "portaria"
        ? "Nada marcado como deixado na portaria."
        : filtro === "lotes"
          ? "Nenhum lote com mais de um item."
          : "Nenhuma encomenda pendente."

  const editarLabel =
    categoria === "correspondencia" ? "Editar correspondência" : "Editar encomenda"
  const temMaisAcoes = allowEdit || canManagePortaria

  return (
    <div className="space-y-3">
      {!isControlled && <PendentesSearchInput value={busca} onChange={setBusca} />}

      {onFiltroChange && (
        <div
          role="group"
          aria-label="Filtros"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        >
          {FILTROS.map((opcao) => {
            const ativo = filtro === opcao.value

            return (
              <button
                key={opcao.value}
                type="button"
                aria-pressed={ativo}
                onClick={() => onFiltroChange(opcao.value)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-11 [&_svg]:size-3.5",
                  ativo
                    ? "border-foreground bg-foreground text-background"
                    : cn(
                        "bg-card hover:bg-muted",
                        opcao.value === "atrasadas" && "text-danger-ink"
                      )
                )}
              >
                {opcao.icon && <opcao.icon aria-hidden />}
                {opcao.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 font-mono text-[0.7rem] leading-none tabular-nums",
                    ativo ? "bg-background/20" : "bg-muted text-muted-foreground"
                  )}
                >
                  {contagemFiltros[opcao.value]}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {lotes.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16">
          <Search className="size-8" />
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <Card className="gap-0 py-0">
          <div
            aria-hidden
            className={cn(
              "text-muted-foreground hidden h-9 items-center border-b text-[0.7rem] font-bold tracking-wider uppercase md:grid",
              ROW_GRID
            )}
          >
            <span>Morador</span>
            <span>Origem e itens</span>
            <span>Recebida</span>
            <span className="text-right">Ação</span>
          </div>

          <ul>
            {lotes.map(({ loteId, itens }) => {
              const encomenda = itens[0]
              if (!encomenda) return null

              const origemLabel =
                encomenda.remetenteNome ??
                transportadoraLabel(encomenda.transportadora, encomenda.transportadoraOutro)
              const atrasada = estaAtrasada(encomenda)
              const naPortaria = Boolean(encomenda.deixadoPortariaPor)

              return (
                <li
                  key={loteId}
                  className={cn(
                    "hover:bg-muted/40 relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2.5 border-b px-4 py-3.5 transition-colors last:border-b-0 md:min-h-17 md:items-center md:py-2.5",
                    ROW_GRID,
                    // Faixa vermelha a esquerda: destaque de atraso (A3).
                    atrasada &&
                      "before:bg-destructive before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full"
                  )}
                >
                  {/* Morador */}
                  <div className="order-1 flex min-w-0 items-center gap-3 md:order-none">
                    <span
                      aria-hidden
                      className="bg-muted text-muted-foreground font-heading flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    >
                      {iniciais(encomenda.moradorNome)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                        <p className="truncate font-semibold">{encomenda.moradorNome}</p>
                        {itens.length > 1 ? (
                          <Badge variant="secondary" className="font-mono tabular-nums">
                            {itens.length} itens
                          </Badge>
                        ) : (
                          encomenda.quantidade > 1 && (
                            <Badge variant="secondary" className="font-mono tabular-nums">
                              ×{encomenda.quantidade}
                            </Badge>
                          )
                        )}
                        {atrasada && (
                          <Badge className="bg-danger-soft text-danger-ink gap-1 rounded-md font-semibold">
                            <AlertTriangle aria-hidden />
                            Mais de {DIAS_ATRASO} dias
                          </Badge>
                        )}
                        {naPortaria && (
                          <Badge className="bg-accent text-accent-foreground gap-1 rounded-md font-semibold">
                            <Flag aria-hidden />
                            Portaria
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground truncate text-sm">
                        {encomenda.rua}, {encomenda.numero}
                      </p>
                    </div>
                  </div>

                  {/* Origem e itens */}
                  <div className="order-3 col-span-2 min-w-0 pl-11 text-sm md:order-none md:col-span-1 md:pl-0">
                    <p className="flex min-w-0 items-center gap-1.5 font-semibold">
                      <span
                        aria-hidden
                        className="bg-muted-foreground/60 size-2 shrink-0 rounded-[2px]"
                      />
                      <span className="truncate">{origemLabel}</span>
                    </p>
                    <p className="text-muted-foreground">
                      {itensLabel(itens)}
                      {naPortaria && encomenda.deixadoPortariaNome && (
                        <> · deixado por {encomenda.deixadoPortariaNome}</>
                      )}
                    </p>
                    {/* Rastreio/NF visiveis na propria linha: o porteiro identifica
                        qual item entregar (inclusive no parcial) sem abrir menus. */}
                    {itens.some((item) => itemIdentificacao(item)) && (
                      <ul className="text-muted-foreground mt-0.5 space-y-0.5 font-mono text-xs">
                        {itens.map((item) => {
                          const identificacao = itemIdentificacao(item)
                          if (!identificacao) return null
                          return (
                            <li key={item.id} className="break-all">
                              {itens.length > 1 && (
                                <span className="font-sans">
                                  {TIPO_ENCOMENDA_LABELS[item.tipo]}:{" "}
                                </span>
                              )}
                              {identificacao}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>

                  {/* Recebida */}
                  <div
                    className={cn(
                      "order-2 text-right font-mono text-sm leading-tight tabular-nums md:order-none md:text-left",
                      atrasada && "text-danger-ink"
                    )}
                  >
                    {formatRecebida(encomenda.recebidaEm)}
                    <span
                      className={cn(
                        "block font-sans text-xs",
                        atrasada ? "text-danger-ink" : "text-muted-foreground"
                      )}
                    >
                      {formatDurationSince(encomenda.recebidaEm)}
                    </span>
                  </div>

                  {/* Acoes: no celular, "Entregar" ocupa o resto da largura (44px). */}
                  <div className="order-4 col-span-2 flex items-center gap-1 md:order-none md:col-span-1 md:justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Adicionar item a este lote"
                      title="Adicionar item a este lote"
                      className="max-md:size-11"
                      onClick={() => setAddingItemLoteId(loteId)}
                    >
                      <PackagePlus />
                    </Button>

                    {temMaisAcoes && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "icon" }),
                            "max-md:size-11"
                          )}
                          aria-label="Mais ações"
                          title="Mais ações"
                        >
                          <Ellipsis />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-56">
                          {allowEdit && itens.length === 1 && (
                            <DropdownMenuItem onClick={() => setEditing(encomenda)}>
                              <Pencil />
                              {editarLabel}
                            </DropdownMenuItem>
                          )}
                          {allowEdit && itens.length > 1 && (
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Editar item do lote</DropdownMenuLabel>
                              {itens.map((item) => (
                                <DropdownMenuItem
                                  key={item.id}
                                  onClick={() => setEditing(item)}
                                >
                                  <Pencil />
                                  <span className="flex min-w-0 flex-col">
                                    <span>
                                      {TIPO_ENCOMENDA_LABELS[item.tipo]}
                                      {item.quantidade > 1 ? ` ×${item.quantidade}` : ""}
                                    </span>
                                    {itemIdentificacao(item) && (
                                      <span className="text-muted-foreground text-xs break-all">
                                        {itemIdentificacao(item)}
                                      </span>
                                    )}
                                  </span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuGroup>
                          )}
                          {allowEdit && canManagePortaria && <DropdownMenuSeparator />}
                          {canManagePortaria && (
                            <DropdownMenuItem
                              disabled={togglingPortariaLoteId === loteId}
                              onClick={() => handleTogglePortaria(loteId, !naPortaria)}
                            >
                              <Flag />
                              {naPortaria
                                ? "Desmarcar deixado na portaria"
                                : "Marcar como deixado na portaria"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {itens.length === 1 ? (
                      <Button
                        size="lg"
                        className="flex-1 md:min-w-28 md:flex-none"
                        onClick={() =>
                          setEntregando({
                            id: encomenda.id,
                            partial: false,
                            itens,
                          })
                        }
                        disabled={entregarMutation.isPending}
                      >
                        <Check />
                        Entregar
                      </Button>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={cn(
                            buttonVariants({ size: "lg" }),
                            "flex-1 md:min-w-28 md:flex-none"
                          )}
                          disabled={entregarMutation.isPending}
                        >
                          <Check />
                          Entregar
                          <ChevronDown className="size-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="max-w-[min(90vw,22rem)] min-w-64"
                        >
                          <DropdownMenuItem
                            onClick={() =>
                              setEntregando({
                                id: encomenda.id,
                                partial: false,
                                itens,
                              })
                            }
                          >
                            Entregar tudo ({itens.length} itens)
                          </DropdownMenuItem>
                          {itens.map((item) => (
                            <DropdownMenuItem
                              key={item.id}
                              className="flex-col items-start"
                              onClick={() =>
                                setEntregando({
                                  id: item.id,
                                  partial: true,
                                  itens: [item],
                                })
                              }
                            >
                              <span>
                                Entregar apenas: {TIPO_ENCOMENDA_LABELS[item.tipo]}
                                {item.quantidade > 1 ? ` ×${item.quantidade}` : ""}
                              </span>
                              {itemIdentificacao(item) && (
                                <span className="text-muted-foreground w-full text-xs break-all">
                                  {itemIdentificacao(item)}
                                </span>
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {allowEdit && categoria === "correspondencia" && (
        <CorrespondenciaFormDialog
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
          mode="edit"
          correspondencia={editing ?? undefined}
          onSuccess={() => {
            void queryClient.invalidateQueries({ queryKey })
            void queryClient.invalidateQueries({ queryKey: ["encomendas-historico"] })
          }}
        />
      )}

      {allowEdit && categoria !== "correspondencia" && (
        <EncomendaFormDialog
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
          mode="edit"
          encomenda={editing ?? undefined}
          onSuccess={() => {
            void queryClient.invalidateQueries({ queryKey })
            void queryClient.invalidateQueries({ queryKey: ["encomendas-historico"] })
          }}
        />
      )}

      <AdicionarItemDialog
        open={addingItemLoteId !== null}
        onOpenChange={(open) => !open && setAddingItemLoteId(null)}
        categoria={categoria}
        loteId={addingItemLoteId ?? ""}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey })
          void queryClient.invalidateQueries({ queryKey: ["cards-stats", categoria] })
          void queryClient.invalidateQueries({ queryKey: ["nav-counts"] })
          void queryClient.invalidateQueries({ queryKey: ["encomendas-historico"] })
        }}
      />

      <AlertDialog
        open={entregando !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEntregando(null)
            setRetiradoPor("")
          }
        }}
      >
        <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar entrega</AlertDialogTitle>
            <AlertDialogDescription>
              {entregando && descricaoEntrega(entregando.itens, entregando.partial)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {entregando && entregando.itens.length > 0 && (
            <ul
              aria-label="Itens a entregar"
              className="bg-muted/40 max-h-64 divide-y overflow-y-auto rounded-lg border"
            >
              {entregando.itens.map((item) => (
                <li key={item.id} className="space-y-0.5 px-3 py-2.5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 font-semibold">
                      {TIPO_ENCOMENDA_LABELS[item.tipo]}
                      {item.quantidade > 1 && (
                        <span className="font-mono tabular-nums"> ×{item.quantidade}</span>
                      )}
                    </p>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatDurationSince(item.recebidaEm)}
                    </span>
                  </div>
                  <p className="text-muted-foreground break-words">{origemDoItem(item)}</p>
                  {(item.codigoRastreio || item.notaFiscal) && (
                    <p className="text-muted-foreground font-mono text-xs break-all">
                      {itemIdentificacao(item)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="retirado-por">Nome de quem retirou</Label>
            <Input
              id="retirado-por"
              className="pointer-coarse:h-11"
              autoFocus
              value={retiradoPor}
              onChange={(event) => setRetiradoPor(event.target.value)}
              placeholder="Nome completo"
              maxLength={120}
              onKeyDown={(event) => {
                if (event.key === "Enter" && retiradoPor.trim()) {
                  event.preventDefault()
                  handleConfirmarEntrega()
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="pointer-coarse:h-11"
              disabled={entregarMutation.isPending}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="pointer-coarse:h-11"
              onClick={handleConfirmarEntrega}
              disabled={entregarMutation.isPending || !retiradoPor.trim()}
            >
              {entregarMutation.isPending ? "Confirmando..." : "Confirmar entrega"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

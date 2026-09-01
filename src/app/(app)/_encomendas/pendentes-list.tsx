"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  Flag,
  Package,
  PackagePlus,
  Pencil,
  Search,
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
import { Badge, badgeVariants } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { diasDesde, formatDurationSince, formatTime } from "@/lib/format"
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

export function PendentesList({
  initialPendentes,
  categoria = "encomenda",
  allowEdit = true,
  busca: buscaControlada,
  onBuscaChange,
  apenasAtrasadas = false,
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
  /** Filtro vindo do card "Pendentes ha mais de 7 dias" — soma-se a busca por nome. */
  apenasAtrasadas?: boolean
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
    moradorNome: string
    itensCount: number
    /** Entrega so este item (id), deixando o resto do lote pendente. */
    partial: boolean
    /** Tipo + rastreio/NF do item, so quando partial — identifica qual item exato esta sendo entregue. */
    identificacao?: string | null
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
      toast.error(offlineAwareErrorMessage("Nao foi possivel registrar a entrega."))
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
        toast.error(offlineAwareErrorMessage("Nao foi possivel atualizar a portaria."))
      } finally {
        setTogglingPortariaLoteId(null)
      }
    })
  }

  const list = pendentes ?? []

  const buscaNormalizada = busca.trim().toLocaleLowerCase("pt-BR")
  const filteredList = list
    .filter((encomenda) =>
      buscaNormalizada
        ? encomenda.moradorNome.toLocaleLowerCase("pt-BR").includes(buscaNormalizada)
        : true
    )
    .filter((encomenda) =>
      apenasAtrasadas ? diasDesde(encomenda.recebidaEm) >= DIAS_ATRASO : true
    )

  if (list.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16">
        <Package className="size-8" />
        <p>
          {categoria === "correspondencia"
            ? "Nenhuma correspondencia pendente."
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

  const lotes = agruparPorLote(filteredList)

  return (
    <div className="space-y-3">
      {!isControlled && <PendentesSearchInput value={busca} onChange={setBusca} />}

      {lotes.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16">
          <Search className="size-8" />
          <p>
            {busca
              ? `Nenhum morador encontrado para "${busca}".`
              : "Nenhuma encomenda atrasada no momento."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lotes.map(({ loteId, itens }) => {
            const encomenda = itens[0]
            if (!encomenda) return null

            const origemLabel =
              encomenda.remetenteNome ??
              transportadoraLabel(encomenda.transportadora, encomenda.transportadoraOutro)
            const atrasada = diasDesde(encomenda.recebidaEm) >= DIAS_ATRASO

            return (
              <Card
                key={loteId}
                className={cn(
                  atrasada && "border-destructive/40 bg-destructive/[0.04]"
                )}
              >
                <CardContent className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-medium">{encomenda.moradorNome}</p>
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
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="size-3" />
                          Mais de {DIAS_ATRASO} dias
                        </Badge>
                      )}
                      {encomenda.deixadoPortariaPor &&
                        (canManagePortaria ? (
                          <button
                            type="button"
                            title={`${encomenda.deixadoPortariaNome} deixou na portaria`}
                            disabled={togglingPortariaLoteId === loteId}
                            onClick={() => handleTogglePortaria(loteId, false)}
                            className={cn(
                              badgeVariants({ variant: "outline" }),
                              "gap-1 border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                            )}
                          >
                            <Flag className="size-3" />
                            Portaria
                          </button>
                        ) : (
                          <Badge
                            variant="outline"
                            title={`${encomenda.deixadoPortariaNome} deixou na portaria`}
                            className="border-primary/30 bg-primary/10 text-primary gap-1"
                          >
                            <Flag className="size-3" />
                            Portaria
                          </Badge>
                        ))}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {encomenda.rua}, {encomenda.numero}
                    </p>
                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 text-xs">
                      <span>{origemLabel}</span>
                      <span>·</span>
                      <span>{itensLabel(itens)}</span>
                      <span>·</span>
                      <span
                        className={cn(atrasada && "text-destructive font-medium")}
                      >
                        {formatTime(encomenda.recebidaEm)} (
                        {formatDurationSince(encomenda.recebidaEm)})
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {canManagePortaria && !encomenda.deixadoPortariaPor && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Marcar como deixado na portaria"
                        title="Marcar como deixado na portaria"
                        disabled={togglingPortariaLoteId === loteId}
                        onClick={() => handleTogglePortaria(loteId, true)}
                      >
                        <Flag />
                      </Button>
                    )}
                    {allowEdit && itens.length === 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar encomenda"
                        onClick={() => setEditing(encomenda)}
                      >
                        <Pencil />
                      </Button>
                    )}
                    {allowEdit && itens.length > 1 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={buttonVariants({ variant: "ghost", size: "icon" })}
                          aria-label="Editar um item deste lote"
                        >
                          <Pencil />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {itens.map((item) => (
                            <DropdownMenuItem
                              key={item.id}
                              onClick={() => setEditing(item)}
                            >
                              {TIPO_ENCOMENDA_LABELS[item.tipo]}
                              {item.quantidade > 1 ? ` ×${item.quantidade}` : ""}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Adicionar item a este lote"
                      onClick={() => setAddingItemLoteId(loteId)}
                    >
                      <PackagePlus />
                    </Button>
                    {itens.length === 1 ? (
                      <Button
                        size="lg"
                        onClick={() =>
                          setEntregando({
                            id: encomenda.id,
                            moradorNome: encomenda.moradorNome,
                            itensCount: 1,
                            partial: false,
                          })
                        }
                        disabled={entregarMutation.isPending}
                      >
                        Entregar
                      </Button>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={buttonVariants({ size: "lg" })}
                          disabled={entregarMutation.isPending}
                        >
                          Entregar
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="min-w-64 max-w-[min(90vw,22rem)]"
                        >
                          <DropdownMenuItem
                            onClick={() =>
                              setEntregando({
                                id: encomenda.id,
                                moradorNome: encomenda.moradorNome,
                                itensCount: itens.length,
                                partial: false,
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
                                  moradorNome: item.moradorNome,
                                  itensCount: 1,
                                  partial: true,
                                  identificacao: itemIdentificacao(item),
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
                </CardContent>
              </Card>
            )
          })}
        </div>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar entrega</AlertDialogTitle>
            <AlertDialogDescription>
              {entregando &&
                (entregando.itensCount > 1
                  ? `${entregando.itensCount} itens para ${entregando.moradorNome}`
                  : entregando.partial && entregando.identificacao
                    ? `${entregando.identificacao} para ${entregando.moradorNome}`
                    : `Encomenda para ${entregando.moradorNome}`)}{" "}
              — informe quem retirou.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="retirado-por">Nome de quem retirou</Label>
            <Input
              id="retirado-por"
              autoFocus
              value={retiradoPor}
              onChange={(event) => setRetiradoPor(event.target.value)}
              placeholder="Nome completo"
              onKeyDown={(event) => {
                if (event.key === "Enter" && retiradoPor.trim()) {
                  event.preventDefault()
                  handleConfirmarEntrega()
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={entregarMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
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

"use client"

import { RotateCcw, Trash2 } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatDateTime } from "@/lib/format"
import { TIPO_ENCOMENDA_LABELS, transportadoraLabel } from "@/lib/labels"
import { offlineAwareErrorMessage } from "@/lib/network"
import { cn } from "@/lib/utils"
import type { EncomendaComDetalhes } from "@/types/domain"

import { excluirEncomendaAction, voltarParaPendenteAction } from "./actions"

function origemLabel(item: EncomendaComDetalhes): string {
  return item.remetenteNome ?? transportadoraLabel(item.transportadora, item.transportadoraOutro)
}

export function EncomendaDetalheCard({
  itens,
  canDelete = false,
  onReverted,
  onDeleted,
}: {
  itens: EncomendaComDetalhes[]
  /** So "desenvolvedor" recebe true — exibe o botao de excluir (encomendas ja entregues). */
  canDelete?: boolean
  onReverted?: () => void
  onDeleted?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const encomenda = itens[0]

  if (!encomenda) return null

  const encomendaId = encomenda.id

  function handleRevert() {
    startTransition(async () => {
      try {
        const result = await voltarParaPendenteAction(encomendaId)

        if (!result.success) {
          toast.error(result.error)
          return
        }

        toast.success(
          itens.length > 1 ? "Itens voltaram para pendente." : "Encomenda voltou para pendente."
        )
        setConfirmOpen(false)
        onReverted?.()
      } catch {
        toast.error(offlineAwareErrorMessage("Não foi possível reverter a entrega."))
      }
    })
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      try {
        const result = await excluirEncomendaAction(encomendaId)

        if (!result.success) {
          toast.error(result.error)
          return
        }

        toast.success(itens.length > 1 ? "Itens excluídos." : "Encomenda excluída.")
        setDeleteConfirmOpen(false)
        onDeleted?.()
      } catch {
        toast.error(offlineAwareErrorMessage("Não foi possível excluir."))
      }
    })
  }

  const entregue = encomenda.status === "entregue"

  return (
    <Card
      className={cn(
        "border-l-4",
        entregue
          ? "border-l-success bg-success/[0.03]"
          : "border-l-warning bg-warning/[0.04]"
      )}
    >
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-medium break-words">{encomenda.moradorNome}</p>
              <Badge
                className={cn(
                  "border-transparent",
                  entregue
                    ? "bg-ok-soft text-ok-ink"
                    : "bg-warn-soft text-warn-ink"
                )}
              >
                {entregue ? "Entregue" : "Pendente"}
              </Badge>
              {itens.length > 1 && (
                <Badge variant="secondary" className="font-mono tabular-nums">
                  {itens.length} itens
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {encomenda.rua}, {encomenda.numero}
            </p>
          </div>
        </div>

        {/* Cada item tem sua propria transportadora/rastreio/quem recebeu — um
            lote pode ter itens registrados em momentos ou por pessoas diferentes
            (ex: alguem adicionou mais um item depois que o lote ja existia). */}
        <div className="divide-y rounded-md border">
          {itens.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-2.5 py-1.5 text-xs"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-foreground font-medium">
                  {TIPO_ENCOMENDA_LABELS[item.tipo]}
                  {item.quantidade > 1 ? ` ×${item.quantidade}` : ""}
                </span>
                <span className="text-muted-foreground">{origemLabel(item)}</span>
                {item.codigoRastreio && (
                  <span className="text-muted-foreground font-mono">
                    Rastreio: <span className="text-foreground">{item.codigoRastreio}</span>
                  </span>
                )}
                {item.notaFiscal && (
                  <span className="text-muted-foreground font-mono">
                    NF: <span className="text-foreground">{item.notaFiscal}</span>
                  </span>
                )}
              </div>
              <span className="text-muted-foreground whitespace-nowrap">
                {item.recebidaPorNome} · {formatDateTime(item.recebidaEm)}
              </span>
            </div>
          ))}
        </div>

        {encomenda.observacoes && (
          <p className="text-muted-foreground text-sm">{encomenda.observacoes}</p>
        )}

        <div className="flex flex-wrap items-end justify-between gap-2 border-t pt-2">
          <div className="text-xs">
            {encomenda.entregueEm && encomenda.entreguePorNome ? (
              <p>
                <span className="text-muted-foreground">Entregue por </span>
                <span className="font-medium">{encomenda.entreguePorNome}</span>
                <span className="text-muted-foreground">
                  {" "}
                  em {formatDateTime(encomenda.entregueEm)}
                </span>
                {encomenda.retiradoPor && (
                  <>
                    <br />
                    <span className="text-muted-foreground">Retirado por </span>
                    <span className="font-medium">{encomenda.retiradoPor}</span>
                  </>
                )}
              </p>
            ) : (
              <p className="text-muted-foreground">Ainda não entregue</p>
            )}
          </div>

          {encomenda.status === "entregue" && (
            <div className="flex items-center gap-1">
              {canDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 />
                  Excluir
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmOpen(true)}
              >
                <RotateCcw />
                Voltar para pendente
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {itens.length > 1
                ? "Voltar estes itens para pendente?"
                : "Voltar esta encomenda para pendente?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              A entrega de {encomenda.moradorNome} registrada por{" "}
              {encomenda.entreguePorNome} será desfeita e{" "}
              {itens.length > 1 ? "os itens voltam" : "a encomenda volta"} a
              aparecer como pendente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert} disabled={isPending}>
              {isPending ? "Revertendo..." : "Voltar para pendente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {itens.length > 1 ? "Excluir estes itens?" : "Excluir esta encomenda?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {itens.length > 1
                ? `Os ${itens.length} itens de ${encomenda.moradorNome} serão excluídos`
                : `A encomenda de ${encomenda.moradorNome} será excluída`}{" "}
              permanentemente. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              variant="destructive-solid"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

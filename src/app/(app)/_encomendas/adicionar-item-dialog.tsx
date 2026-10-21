"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { QuantityStepper } from "@/components/ui/quantity-stepper"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  TIPO_ENCOMENDA_LABELS,
  TIPO_ENCOMENDA_OPTIONS_SEM_CARTA,
} from "@/lib/labels"
import { offlineAwareErrorMessage } from "@/lib/network"
import type { EncomendaCategoria } from "@/repositories/encomenda-repository"
import {
  type EncomendaAddItemInput,
  encomendaAddItemSchema,
} from "@/schemas/encomenda"
import type { Remetente } from "@/types/domain"
import {
  type CorrespondenciaAddItemInput,
  correspondenciaAddItemSchema,
} from "@/schemas/correspondencia"

import { addItemToEncomendaLoteAction } from "./actions"
import { IdentificacaoFields } from "./identificacao-fields"
import { TransportadoraField } from "./transportadora-field"
import {
  addItemToCorrespondenciaLoteAction,
  type CorrespondenciaActionResult,
} from "../correspondencia/actions"
import { RemetenteCombobox } from "../correspondencia/remetente-combobox"
import type { EncomendaActionResult } from "./actions"

export function AdicionarItemDialog({
  open,
  onOpenChange,
  categoria,
  loteId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoria: EncomendaCategoria
  loteId: string
  onSuccess?: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open &&
          (categoria === "correspondencia" ? (
            <AdicionarCorrespondenciaItemForm
              loteId={loteId}
              onOpenChange={onOpenChange}
              onSuccess={onSuccess}
            />
          ) : (
            <AdicionarEncomendaItemForm
              loteId={loteId}
              onOpenChange={onOpenChange}
              onSuccess={onSuccess}
            />
          ))}
      </DialogContent>
    </Dialog>
  )
}

function AdicionarEncomendaItemForm({
  loteId,
  onOpenChange,
  onSuccess,
}: {
  loteId: string
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<EncomendaAddItemInput>({
    resolver: zodResolver(encomendaAddItemSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      tipo: "caixa",
      quantidade: 1,
      transportadora: "correios",
      transportadoraOutro: "",
      codigoRastreio: "",
      notaFiscal: "",
      observacoes: "",
    },
  })

  function onSubmit(values: EncomendaAddItemInput) {
    startTransition(async () => {
      try {
        const result: EncomendaActionResult = await addItemToEncomendaLoteAction(
          loteId,
          values
        )

        if (!result.success) {
          toast.error(result.error)
          return
        }

        toast.success("Item adicionado.")
        onOpenChange(false)
        onSuccess?.()
      } catch {
        toast.error(offlineAwareErrorMessage("Nao foi possivel adicionar o item."))
      }
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Adicionar item</DialogTitle>
        <DialogDescription>
          O item novo entra no mesmo lote, com sua propria data e quem registrou.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(value: keyof typeof TIPO_ENCOMENDA_LABELS) =>
                            TIPO_ENCOMENDA_LABELS[value]
                          }
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIPO_ENCOMENDA_OPTIONS_SEM_CARTA.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade</FormLabel>
                  <FormControl>
                    <QuantityStepper value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <TransportadoraField
            control={form.control}
            transportadoraName="transportadora"
            transportadoraOutroName="transportadoraOutro"
          />

          <IdentificacaoFields
            control={form.control}
            rastreioName="codigoRastreio"
            notaFiscalName="notaFiscal"
          />

          <FormField
            control={form.control}
            name="observacoes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observacoes (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ex: caixa grande, precisa assinar..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" size="lg" disabled={isPending}>
              {isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  )
}

function AdicionarCorrespondenciaItemForm({
  loteId,
  onOpenChange,
  onSuccess,
}: {
  loteId: string
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [selectedRemetente, setSelectedRemetente] = useState<Remetente | null>(null)

  const form = useForm<CorrespondenciaAddItemInput>({
    resolver: zodResolver(correspondenciaAddItemSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      remetenteId: "",
      quantidade: 1,
      codigoRastreio: "",
      notaFiscal: "",
    },
  })

  function handleRemetenteChange(remetente: Remetente) {
    setSelectedRemetente(remetente)
    form.setValue("remetenteId", remetente.id, { shouldValidate: true })
  }

  function onSubmit(values: CorrespondenciaAddItemInput) {
    startTransition(async () => {
      try {
        const result: CorrespondenciaActionResult =
          await addItemToCorrespondenciaLoteAction(loteId, values)

        if (!result.success) {
          toast.error(result.error)
          return
        }

        toast.success("Item adicionado.")
        onOpenChange(false)
        onSuccess?.()
      } catch {
        toast.error(offlineAwareErrorMessage("Nao foi possivel adicionar o item."))
      }
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Adicionar item</DialogTitle>
        <DialogDescription>
          O item novo entra no mesmo lote, com sua propria data e quem registrou.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="remetenteId"
              render={() => (
                <FormItem>
                  <FormLabel>Remetente</FormLabel>
                  <FormControl>
                    <RemetenteCombobox
                      value={selectedRemetente}
                      onChange={handleRemetenteChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade</FormLabel>
                  <FormControl>
                    <QuantityStepper value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <IdentificacaoFields
            control={form.control}
            rastreioName="codigoRastreio"
            notaFiscalName="notaFiscal"
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" size="lg" disabled={isPending}>
              {isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  )
}

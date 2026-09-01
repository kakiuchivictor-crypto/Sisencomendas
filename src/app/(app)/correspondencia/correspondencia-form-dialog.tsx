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
import { Input } from "@/components/ui/input"
import { QuantityStepper } from "@/components/ui/quantity-stepper"
import { Textarea } from "@/components/ui/textarea"
import { offlineAwareErrorMessage } from "@/lib/network"
import {
  type CorrespondenciaCreateInput,
  type CorrespondenciaUpdateInput,
  correspondenciaCreateSchema,
  correspondenciaUpdateSchema,
} from "@/schemas/correspondencia"
import type { EncomendaComDetalhes, Morador, Remetente } from "@/types/domain"

import { createCorrespondenciaAction, updateCorrespondenciaAction } from "./actions"
import { RemetenteCombobox } from "./remetente-combobox"
import { MoradorSearchCombobox } from "../_encomendas/morador-search-combobox"
import { MoradorFormDialog } from "../moradores/morador-form-dialog"

export function CorrespondenciaFormDialog({
  open,
  onOpenChange,
  mode = "create",
  correspondencia,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: "create" | "edit"
  correspondencia?: EncomendaComDetalhes
  onSuccess?: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {open &&
          (mode === "edit" && correspondencia ? (
            <EditCorrespondenciaForm
              key={correspondencia.id}
              correspondencia={correspondencia}
              onOpenChange={onOpenChange}
              onSuccess={onSuccess}
            />
          ) : (
            <CreateCorrespondenciaForm
              key="create"
              onOpenChange={onOpenChange}
              onSuccess={onSuccess}
            />
          ))}
      </DialogContent>
    </Dialog>
  )
}

function moradorFromCorrespondencia(correspondencia: EncomendaComDetalhes): Morador {
  return {
    id: correspondencia.moradorId,
    nome: correspondencia.moradorNome,
    rua: correspondencia.rua,
    numero: correspondencia.numero,
    observacoes: null,
    condominioId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function remetenteFromCorrespondencia(
  correspondencia: EncomendaComDetalhes
): Remetente | null {
  if (!correspondencia.remetenteId) return null

  return {
    id: correspondencia.remetenteId,
    nome: correspondencia.remetenteNome ?? "",
    condominioId: "",
    createdAt: new Date(),
  }
}

function CreateCorrespondenciaForm({
  onOpenChange,
  onSuccess,
}: {
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [selectedMorador, setSelectedMorador] = useState<Morador | null>(null)
  const [selectedRemetente, setSelectedRemetente] = useState<Remetente | null>(null)
  const [quickCreate, setQuickCreate] = useState<
    { open: false } | { open: true; searchTerm: string }
  >({ open: false })

  const form = useForm<CorrespondenciaCreateInput>({
    resolver: zodResolver(correspondenciaCreateSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      moradorId: "",
      rua: "",
      numero: "",
      remetenteId: "",
      quantidade: 1,
      codigoRastreio: "",
      observacoes: "",
    },
  })

  function handleMoradorChange(morador: Morador) {
    setSelectedMorador(morador)
    form.setValue("moradorId", morador.id, { shouldValidate: true })
    form.setValue("rua", morador.rua, { shouldValidate: true })
    form.setValue("numero", morador.numero, { shouldValidate: true })
  }

  function handleRemetenteChange(remetente: Remetente) {
    setSelectedRemetente(remetente)
    form.setValue("remetenteId", remetente.id, { shouldValidate: true })
  }

  function onSubmit(values: CorrespondenciaCreateInput) {
    startTransition(async () => {
      try {
        const result = await createCorrespondenciaAction(values)

        if (!result.success) {
          toast.error(result.error)
          return
        }

        toast.success("Correspondencia cadastrada com sucesso.")
        onOpenChange(false)
        onSuccess?.()
      } catch {
        toast.error(offlineAwareErrorMessage("Nao foi possivel registrar a correspondencia."))
      }
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cadastrar correspondencia</DialogTitle>
        <DialogDescription>
          Busque o morador e informe quantas cartas chegaram.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="moradorId"
            render={() => (
              <FormItem>
                <FormLabel>Morador</FormLabel>
                <FormControl>
                  <MoradorSearchCombobox
                    value={selectedMorador}
                    onChange={handleMoradorChange}
                    onRequestCreate={(term) =>
                      setQuickCreate({ open: true, searchTerm: term })
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <FormField
                control={form.control}
                name="rua"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rua</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="numero"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numero</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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

          <FormField
            control={form.control}
            name="codigoRastreio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Codigo de rastreio (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: BR123456789BR" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="observacoes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observacoes (opcional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Ex: carta registrada..." {...field} />
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
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </Form>

      <MoradorFormDialog
        open={quickCreate.open}
        onOpenChange={(nextOpen) =>
          setQuickCreate(nextOpen ? { open: true, searchTerm: "" } : { open: false })
        }
        mode="create"
        initialNome={quickCreate.open ? quickCreate.searchTerm : undefined}
        onSuccess={(morador) => handleMoradorChange(morador)}
      />
    </>
  )
}

function EditCorrespondenciaForm({
  correspondencia,
  onOpenChange,
  onSuccess,
}: {
  correspondencia: EncomendaComDetalhes
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [selectedMorador, setSelectedMorador] = useState<Morador | null>(
    moradorFromCorrespondencia(correspondencia)
  )
  const [selectedRemetente, setSelectedRemetente] = useState<Remetente | null>(
    remetenteFromCorrespondencia(correspondencia)
  )
  const [quickCreate, setQuickCreate] = useState<
    { open: false } | { open: true; searchTerm: string }
  >({ open: false })

  const form = useForm<CorrespondenciaUpdateInput>({
    resolver: zodResolver(correspondenciaUpdateSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      moradorId: correspondencia.moradorId,
      rua: correspondencia.rua,
      numero: correspondencia.numero,
      remetenteId: correspondencia.remetenteId ?? "",
      quantidade: correspondencia.quantidade,
      codigoRastreio: correspondencia.codigoRastreio ?? "",
      observacoes: correspondencia.observacoes ?? "",
    },
  })

  function handleMoradorChange(morador: Morador) {
    setSelectedMorador(morador)
    form.setValue("moradorId", morador.id, { shouldValidate: true })
    form.setValue("rua", morador.rua, { shouldValidate: true })
    form.setValue("numero", morador.numero, { shouldValidate: true })
  }

  function handleRemetenteChange(remetente: Remetente) {
    setSelectedRemetente(remetente)
    form.setValue("remetenteId", remetente.id, { shouldValidate: true })
  }

  function onSubmit(values: CorrespondenciaUpdateInput) {
    startTransition(async () => {
      try {
        const result = await updateCorrespondenciaAction(correspondencia.id, values)

        if (!result.success) {
          toast.error(result.error)
          return
        }

        toast.success("Correspondencia atualizada.")
        onOpenChange(false)
        onSuccess?.()
      } catch {
        toast.error(offlineAwareErrorMessage("Nao foi possivel atualizar a correspondencia."))
      }
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar correspondencia</DialogTitle>
        <DialogDescription>
          Busque o morador, confira o endereco e o remetente.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="moradorId"
            render={() => (
              <FormItem>
                <FormLabel>Morador</FormLabel>
                <FormControl>
                  <MoradorSearchCombobox
                    value={selectedMorador}
                    onChange={handleMoradorChange}
                    onRequestCreate={(term) =>
                      setQuickCreate({ open: true, searchTerm: term })
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <FormField
                control={form.control}
                name="rua"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rua</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="numero"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numero</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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

          <FormField
            control={form.control}
            name="codigoRastreio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Codigo de rastreio (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: BR123456789BR" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="observacoes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observacoes (opcional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Ex: carta registrada..." {...field} />
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
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </Form>

      <MoradorFormDialog
        open={quickCreate.open}
        onOpenChange={(nextOpen) =>
          setQuickCreate(nextOpen ? { open: true, searchTerm: "" } : { open: false })
        }
        mode="create"
        initialNome={quickCreate.open ? quickCreate.searchTerm : undefined}
        onSuccess={(morador) => handleMoradorChange(morador)}
      />
    </>
  )
}

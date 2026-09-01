"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { offlineAwareErrorMessage } from "@/lib/network"
import { type MoradorInput, moradorSchema } from "@/schemas/morador"
import type { Morador } from "@/types/domain"

import { createMoradorAction, updateMoradorAction } from "./actions"

export function MoradorFormDialog({
  open,
  onOpenChange,
  mode,
  morador,
  initialNome,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  morador?: Morador
  initialNome?: string
  onSuccess?: (morador: Morador) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {open && (
          <MoradorForm
            key={mode === "edit" ? morador?.id : `create-${initialNome ?? ""}`}
            mode={mode}
            morador={morador}
            initialNome={initialNome}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function MoradorForm({
  mode,
  morador,
  initialNome,
  onOpenChange,
  onSuccess,
}: {
  mode: "create" | "edit"
  morador?: Morador
  initialNome?: string
  onOpenChange: (open: boolean) => void
  onSuccess?: (morador: Morador) => void
}) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<MoradorInput>({
    resolver: zodResolver(moradorSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues:
      mode === "edit" && morador
        ? {
            nome: morador.nome,
            rua: morador.rua,
            numero: morador.numero,
            observacoes: morador.observacoes ?? undefined,
          }
        : { nome: initialNome ?? "", rua: "", numero: "", observacoes: undefined },
  })

  function onSubmit(values: MoradorInput) {
    startTransition(async () => {
      try {
        const result =
          mode === "edit" && morador
            ? await updateMoradorAction(morador.id, values)
            : await createMoradorAction(values)

        if (!result.success) {
          toast.error(result.error)
          return
        }

        toast.success(
          mode === "edit" ? "Morador atualizado." : "Morador cadastrado com sucesso."
        )
        onOpenChange(false)
        onSuccess?.(result.morador)
      } catch {
        toast.error(offlineAwareErrorMessage("Nao foi possivel salvar o morador."))
      }
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {mode === "edit" ? "Editar morador" : "Cadastrar morador"}
        </DialogTitle>
        <DialogDescription>
          Preencha os dados basicos do morador. Nome, rua e numero sao
          obrigatorios.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input autoFocus placeholder="Nome do morador" {...field} />
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
                      <Input placeholder="Nome da rua" {...field} />
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
                    <Input placeholder="123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="observacoes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observacoes (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ex: portao dos fundos, cachorro no quintal..."
                    {...field}
                    value={field.value ?? ""}
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  )
}

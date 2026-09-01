"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"
import { useState, useTransition } from "react"
import { type Control, useFieldArray, useForm, useWatch } from "react-hook-form"
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
  TRANSPORTADORA_LABELS,
  TRANSPORTADORA_OPTIONS,
} from "@/lib/labels"
import { offlineAwareErrorMessage } from "@/lib/network"
import {
  type EncomendaCreateInput,
  type EncomendaUpdateInput,
  encomendaCreateSchema,
  encomendaUpdateSchema,
} from "@/schemas/encomenda"
import type { EncomendaComDetalhes, Morador } from "@/types/domain"

import { createEncomendaAction, updateEncomendaAction } from "./actions"
import { MoradorSearchCombobox } from "./morador-search-combobox"

import { MoradorFormDialog } from "../moradores/morador-form-dialog"

export function EncomendaFormDialog({
  open,
  onOpenChange,
  mode,
  encomenda,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  encomenda?: EncomendaComDetalhes
  onSuccess?: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {open &&
          (mode === "edit" && encomenda ? (
            <EditEncomendaForm
              key={encomenda.id}
              encomenda={encomenda}
              onOpenChange={onOpenChange}
              onSuccess={onSuccess}
            />
          ) : (
            <CreateEncomendaForm
              key="create"
              onOpenChange={onOpenChange}
              onSuccess={onSuccess}
            />
          ))}
      </DialogContent>
    </Dialog>
  )
}

function moradorFromEncomenda(encomenda: EncomendaComDetalhes): Morador {
  return {
    id: encomenda.moradorId,
    nome: encomenda.moradorNome,
    rua: encomenda.rua,
    numero: encomenda.numero,
    observacoes: null,
    condominioId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function useMoradorField(initial: Morador | null) {
  const [selectedMorador, setSelectedMorador] = useState<Morador | null>(initial)
  const [quickCreate, setQuickCreate] = useState<
    { open: false } | { open: true; searchTerm: string }
  >({ open: false })

  return { selectedMorador, setSelectedMorador, quickCreate, setQuickCreate }
}

function MoradorField({
  selectedMorador,
  onMoradorChange,
  onRequestCreate,
}: {
  selectedMorador: Morador | null
  onMoradorChange: (morador: Morador) => void
  onRequestCreate: (term: string) => void
}) {
  return (
    <FormItem>
      <FormLabel>Morador</FormLabel>
      <FormControl>
        <MoradorSearchCombobox
          value={selectedMorador}
          onChange={onMoradorChange}
          onRequestCreate={onRequestCreate}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )
}

/**
 * Um item = um pacote fisico dentro do lote, com sua propria transportadora/
 * rastreio/NF — lotes registrados juntos podem vir de transportadoras
 * diferentes (ex: 1 caixa dos Correios + 1 pacote da Amazon no mesmo dia).
 */
function EncomendaItemFields({
  control,
  index,
  canRemove,
  onRemove,
}: {
  control: Control<EncomendaCreateInput>
  index: number
  canRemove: boolean
  onRemove: () => void
}) {
  const transportadora = useWatch({
    control,
    name: `itens.${index}.transportadora`,
  })

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-start gap-2">
        <FormField
          control={control}
          name={`itens.${index}.tipo`}
          render={({ field }) => (
            <FormItem className="flex-1">
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
          control={control}
          name={`itens.${index}.quantidade`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <QuantityStepper
                  value={field.value}
                  onChange={field.onChange}
                  inputClassName="w-16"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Remover item"
          disabled={!canRemove}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>

      <FormField
        control={control}
        name={`itens.${index}.transportadora`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Transportadora</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: keyof typeof TRANSPORTADORA_LABELS) =>
                      TRANSPORTADORA_LABELS[value]
                    }
                  </SelectValue>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {TRANSPORTADORA_OPTIONS.map((option) => (
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

      {transportadora === "outros" && (
        <FormField
          control={control}
          name={`itens.${index}.transportadoraOutro`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Qual transportadora?</FormLabel>
              <FormControl>
                <Input placeholder="Nome da transportadora" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name={`itens.${index}.codigoRastreio`}
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
          control={control}
          name={`itens.${index}.notaFiscal`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nota fiscal (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Numero da NF" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

function CreateEncomendaForm({
  onOpenChange,
  onSuccess,
}: {
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const { selectedMorador, setSelectedMorador, quickCreate, setQuickCreate } =
    useMoradorField(null)

  const form = useForm<EncomendaCreateInput>({
    resolver: zodResolver(encomendaCreateSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      moradorId: "",
      rua: "",
      numero: "",
      itens: [
        {
          tipo: "caixa",
          quantidade: 1,
          transportadora: "correios",
          transportadoraOutro: "",
          codigoRastreio: "",
          notaFiscal: "",
        },
      ],
      observacoes: "",
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "itens",
  })

  function handleMoradorChange(morador: Morador) {
    setSelectedMorador(morador)
    form.setValue("moradorId", morador.id, { shouldValidate: true })
    form.setValue("rua", morador.rua, { shouldValidate: true })
    form.setValue("numero", morador.numero, { shouldValidate: true })
  }

  function onSubmit(values: EncomendaCreateInput) {
    startTransition(async () => {
      try {
        const result = await createEncomendaAction(values)

        if (!result.success) {
          toast.error(result.error)
          return
        }

        toast.success(
          result.encomendas.length > 1
            ? `${result.encomendas.length} itens cadastrados com sucesso.`
            : "Encomenda cadastrada com sucesso."
        )
        onOpenChange(false)
        onSuccess?.()
      } catch {
        toast.error(offlineAwareErrorMessage("Nao foi possivel registrar a encomenda."))
      }
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cadastrar encomenda</DialogTitle>
        <DialogDescription>
          Busque o morador, confira o endereco e adicione um ou mais itens.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="moradorId"
            render={() => (
              <MoradorField
                selectedMorador={selectedMorador}
                onMoradorChange={handleMoradorChange}
                onRequestCreate={(term) => setQuickCreate({ open: true, searchTerm: term })}
              />
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm leading-none font-medium">Itens</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    tipo: "caixa",
                    quantidade: 1,
                    transportadora: "correios",
                    transportadoraOutro: "",
                    codigoRastreio: "",
                    notaFiscal: "",
                  })
                }
              >
                <Plus />
                Adicionar item
              </Button>
            </div>

            {fields.map((itemField, index) => (
              <EncomendaItemFields
                key={itemField.id}
                control={form.control}
                index={index}
                canRemove={fields.length > 1}
                onRemove={() => remove(index)}
              />
            ))}
          </div>

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

function EditEncomendaForm({
  encomenda,
  onOpenChange,
  onSuccess,
}: {
  encomenda: EncomendaComDetalhes
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const { selectedMorador, setSelectedMorador, quickCreate, setQuickCreate } =
    useMoradorField(moradorFromEncomenda(encomenda))

  const form = useForm<EncomendaUpdateInput>({
    resolver: zodResolver(encomendaUpdateSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      moradorId: encomenda.moradorId,
      rua: encomenda.rua,
      numero: encomenda.numero,
      transportadora: encomenda.transportadora ?? "correios",
      transportadoraOutro: encomenda.transportadoraOutro ?? "",
      tipo: encomenda.tipo,
      quantidade: encomenda.quantidade,
      codigoRastreio: encomenda.codigoRastreio ?? "",
      notaFiscal: encomenda.notaFiscal ?? "",
      observacoes: encomenda.observacoes ?? "",
    },
  })

  const transportadora = useWatch({ control: form.control, name: "transportadora" })

  function handleMoradorChange(morador: Morador) {
    setSelectedMorador(morador)
    form.setValue("moradorId", morador.id, { shouldValidate: true })
    form.setValue("rua", morador.rua, { shouldValidate: true })
    form.setValue("numero", morador.numero, { shouldValidate: true })
  }

  function onSubmit(values: EncomendaUpdateInput) {
    startTransition(async () => {
      try {
        const result = await updateEncomendaAction(encomenda.id, values)

        if (!result.success) {
          toast.error(result.error)
          return
        }

        toast.success("Encomenda atualizada.")
        onOpenChange(false)
        onSuccess?.()
      } catch {
        toast.error(offlineAwareErrorMessage("Nao foi possivel atualizar a encomenda."))
      }
    })
  }

  const tipoOptions =
    encomenda.tipo === "carta"
      ? [{ value: "carta" as const, label: TIPO_ENCOMENDA_LABELS.carta }]
      : TIPO_ENCOMENDA_OPTIONS_SEM_CARTA

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar encomenda</DialogTitle>
        <DialogDescription>
          Busque o morador, confira o endereco e escolha a transportadora.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="moradorId"
            render={() => (
              <MoradorField
                selectedMorador={selectedMorador}
                onMoradorChange={handleMoradorChange}
                onRequestCreate={(term) => setQuickCreate({ open: true, searchTerm: term })}
              />
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

          <FormField
            control={form.control}
            name="transportadora"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transportadora</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: keyof typeof TRANSPORTADORA_LABELS) =>
                          TRANSPORTADORA_LABELS[value]
                        }
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TRANSPORTADORA_OPTIONS.map((option) => (
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
                      {tipoOptions.map((option) => (
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

          {transportadora === "outros" && (
            <FormField
              control={form.control}
              name="transportadoraOutro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qual transportadora?</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da transportadora" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
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
              name="notaFiscal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota fiscal (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Numero da NF" {...field} />
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

"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"
import { useId, useRef, useState, useTransition } from "react"
import { type Control, useFieldArray, useForm } from "react-hook-form"
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
import {
  TIPO_ENCOMENDA_LABELS,
  TIPO_ENCOMENDA_OPTIONS_SEM_CARTA,
  type TipoEncomenda,
} from "@/lib/labels"
import { offlineAwareErrorMessage } from "@/lib/network"
import { cn } from "@/lib/utils"
import {
  type EncomendaCreateInput,
  type EncomendaUpdateInput,
  encomendaCreateSchema,
  encomendaUpdateComIdentificacaoSchema,
  encomendaUpdateSchema,
} from "@/schemas/encomenda"
import { temIdentificacao } from "@/schemas/identificacao"
import type { EncomendaComDetalhes, Morador } from "@/types/domain"

import { createEncomendaAction, updateEncomendaAction } from "./actions"
import { IdentificacaoFields } from "./identificacao-fields"
import { MoradorSearchCombobox } from "./morador-search-combobox"
import { TransportadoraField } from "./transportadora-field"

import { MoradorFormDialog } from "../moradores/morador-form-dialog"

/**
 * Dialogo central ampliado (~600px) com cabecalho e rodape fixos e so o
 * corpo rolando. Abaixo de sm vira folha inferior quase em tela cheia.
 */
const FORM_DIALOG_CONTENT_CLASSNAME = cn(
  "flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl",
  "max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[calc(100dvh-2.75rem)] max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:data-open:slide-in-from-bottom-10"
)
const FORM_HEADER_CLASSNAME =
  "shrink-0 border-b px-5 pt-5 pr-14 pb-3.5 max-sm:px-4 max-sm:pt-3 max-sm:pr-14"
const FORM_TITLE_CLASSNAME = "text-lg font-semibold"
const FORM_BODY_CLASSNAME =
  "min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 max-sm:px-4"
const FORM_FOOTER_CLASSNAME =
  "mx-0 mb-0 shrink-0 flex-row items-center justify-end rounded-none px-5 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] max-sm:px-4 max-sm:*:flex-1"

const NOVO_ITEM: EncomendaCreateInput["itens"][number] = {
  tipo: "caixa",
  quantidade: 1,
  transportadora: "correios",
  transportadoraOutro: "",
  codigoRastreio: "",
  notaFiscal: "",
}

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
  // "Salvar e nova": em vez de resetar o form com useEffect, troca a key e o
  // formulario de cadastro remonta limpo (mesmo padrao de abrir/fechar).
  const [createKey, setCreateKey] = useState(0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={FORM_DIALOG_CONTENT_CLASSNAME}>
        <span
          aria-hidden
          className="bg-border mx-auto mt-2 block h-1 w-9 shrink-0 rounded-full sm:hidden"
        />
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
              key={`create-${createKey}`}
              onOpenChange={onOpenChange}
              onSuccess={onSuccess}
              onSaveAndNew={() => setCreateKey((current) => current + 1)}
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

/** Texto auxiliar "opcional" ao lado do rotulo (no lugar de "(opcional)"). */
function OpcionalHint() {
  return <span className="text-muted-foreground text-xs font-normal">opcional</span>
}

/**
 * Tipo em botoes segmentados (1 toque em vez de abrir um select): botoes
 * com aria-pressed dentro de um grupo rotulado por "Tipo".
 */
function TipoSegmentedField({
  value,
  onChange,
  options,
}: {
  value: TipoEncomenda
  onChange: (value: TipoEncomenda) => void
  options: { value: TipoEncomenda; label: string }[]
}) {
  const labelId = useId()

  return (
    <FormItem>
      <span id={labelId} className="text-sm leading-none font-medium select-none">
        Tipo
      </span>
      <FormControl>
        <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
          {options.map((option) => {
            const selected = value === option.value

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(option.value)}
                className={cn(
                  "h-9 rounded-md border px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-11",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted dark:bg-input/30"
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
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
  return (
    <fieldset className="min-w-0 space-y-3 rounded-lg border p-3">
      <legend className="sr-only">Item {index + 1}</legend>
      <div className="flex items-center justify-between">
        <span
          aria-hidden
          className="text-muted-foreground font-mono text-xs font-semibold tracking-wider uppercase"
        >
          Item {index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remover item ${index + 1}`}
          disabled={!canRemove}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>

      <FormField
        control={control}
        name={`itens.${index}.tipo`}
        render={({ field }) => (
          <TipoSegmentedField
            value={field.value}
            onChange={field.onChange}
            options={TIPO_ENCOMENDA_OPTIONS_SEM_CARTA}
          />
        )}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <TransportadoraField
          control={control}
          transportadoraName={`itens.${index}.transportadora`}
          transportadoraOutroName={`itens.${index}.transportadoraOutro`}
        />

        <FormField
          control={control}
          name={`itens.${index}.quantidade`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantidade</FormLabel>
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
      </div>

      <IdentificacaoFields
        control={control}
        rastreioName={`itens.${index}.codigoRastreio`}
        notaFiscalName={`itens.${index}.notaFiscal`}
      />
    </fieldset>
  )
}

function EnderecoFields({
  control,
}: {
  control: Control<EncomendaCreateInput> | Control<EncomendaUpdateInput>
}) {
  // Rua/Numero tem o mesmo nome nos dois schemas; o cast evita duplicar o JSX.
  const sharedControl = control as Control<EncomendaCreateInput>

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="col-span-2">
        <FormField
          control={sharedControl}
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
        control={sharedControl}
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
  )
}

function CreateEncomendaForm({
  onOpenChange,
  onSuccess,
  onSaveAndNew,
}: {
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  /** Chamado apos salvar via "Salvar e nova" — o pai remonta o form limpo. */
  onSaveAndNew: () => void
}) {
  const [isPending, startTransition] = useTransition()
  // Guarda sincrona contra envio duplicado: num duplo clique rapido o segundo
  // submit chega antes de isPending virar true (o botao ainda esta habilitado).
  const submittingRef = useRef(false)
  const itensHeadingId = useId()
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
      itens: [{ ...NOVO_ITEM }],
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

  function onSubmit(values: EncomendaCreateInput, saveAndNew: boolean) {
    if (submittingRef.current) return
    submittingRef.current = true

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
        onSuccess?.()
        if (saveAndNew) {
          onSaveAndNew()
        } else {
          onOpenChange(false)
        }
      } catch {
        toast.error(offlineAwareErrorMessage("Nao foi possivel registrar a encomenda."))
      } finally {
        submittingRef.current = false
      }
    })
  }

  return (
    <>
      <DialogHeader className={FORM_HEADER_CLASSNAME}>
        <DialogTitle className={FORM_TITLE_CLASSNAME}>Cadastrar encomenda</DialogTitle>
        <DialogDescription>
          Busque o morador, confira o endereco e adicione um ou mais itens.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form
          onSubmit={(event) =>
            void form.handleSubmit((values) => onSubmit(values, false))(event)
          }
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className={FORM_BODY_CLASSNAME}>
            <FormField
              control={form.control}
              name="moradorId"
              render={() => (
                <MoradorField
                  selectedMorador={selectedMorador}
                  onMoradorChange={handleMoradorChange}
                  onRequestCreate={(term) =>
                    setQuickCreate({ open: true, searchTerm: term })
                  }
                />
              )}
            />

            <EnderecoFields control={form.control} />

            <section aria-labelledby={itensHeadingId} className="space-y-3">
              <h3
                id={itensHeadingId}
                className="font-sans text-sm leading-none font-medium tracking-normal"
              >
                Itens
              </h3>

              {fields.map((itemField, index) => (
                <EncomendaItemFields
                  key={itemField.id}
                  control={form.control}
                  index={index}
                  canRemove={fields.length > 1}
                  onRemove={() => remove(index)}
                />
              ))}

              <Button type="button" variant="outline" onClick={() => append({ ...NOVO_ITEM })}>
                <Plus />
                Adicionar outro item
              </Button>
            </section>

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Observacoes <OpcionalHint />
                  </FormLabel>
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
          </div>

          <DialogFooter className={FORM_FOOTER_CLASSNAME}>
            {/* No celular o "X" do cabecalho fecha; o rodape fica so com as acoes de salvar. */}
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="max-sm:hidden"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={isPending}
              onClick={(event) =>
                void form.handleSubmit((values) => onSubmit(values, true))(event)
              }
            >
              Salvar e nova
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
  // Mesma guarda do formulario de cadastro (duplo clique em "Salvar").
  const submittingRef = useRef(false)
  const { selectedMorador, setSelectedMorador, quickCreate, setQuickCreate } =
    useMoradorField(moradorFromEncomenda(encomenda))

  // Regra de NF/rastreio na edicao: so vale se o registro ja tinha um dos
  // dois (legado sem nenhum continua editavel). O form remonta por key, entao
  // o valor e fixo durante a vida deste componente.
  const exigeIdentificacao = temIdentificacao(encomenda)

  const form = useForm<EncomendaUpdateInput>({
    resolver: zodResolver(
      exigeIdentificacao ? encomendaUpdateComIdentificacaoSchema : encomendaUpdateSchema
    ),
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

  function handleMoradorChange(morador: Morador) {
    setSelectedMorador(morador)
    form.setValue("moradorId", morador.id, { shouldValidate: true })
    form.setValue("rua", morador.rua, { shouldValidate: true })
    form.setValue("numero", morador.numero, { shouldValidate: true })
  }

  function onSubmit(values: EncomendaUpdateInput) {
    if (submittingRef.current) return
    submittingRef.current = true

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
      } finally {
        submittingRef.current = false
      }
    })
  }

  const tipoOptions =
    encomenda.tipo === "carta"
      ? [{ value: "carta" as const, label: TIPO_ENCOMENDA_LABELS.carta }]
      : TIPO_ENCOMENDA_OPTIONS_SEM_CARTA

  return (
    <>
      <DialogHeader className={FORM_HEADER_CLASSNAME}>
        <DialogTitle className={FORM_TITLE_CLASSNAME}>Editar encomenda</DialogTitle>
        <DialogDescription>
          Busque o morador, confira o endereco e escolha a transportadora.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form
          onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className={FORM_BODY_CLASSNAME}>
            <FormField
              control={form.control}
              name="moradorId"
              render={() => (
                <MoradorField
                  selectedMorador={selectedMorador}
                  onMoradorChange={handleMoradorChange}
                  onRequestCreate={(term) =>
                    setQuickCreate({ open: true, searchTerm: term })
                  }
                />
              )}
            />

            <EnderecoFields control={form.control} />

            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <TipoSegmentedField
                  value={field.value}
                  onChange={field.onChange}
                  options={tipoOptions}
                />
              )}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <TransportadoraField
                control={form.control}
                transportadoraName="transportadora"
                transportadoraOutroName="transportadoraOutro"
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
              obrigatorio={exigeIdentificacao}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Observacoes <OpcionalHint />
                  </FormLabel>
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
          </div>

          <DialogFooter className={FORM_FOOTER_CLASSNAME}>
            <Button
              type="button"
              variant="outline"
              size="lg"
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

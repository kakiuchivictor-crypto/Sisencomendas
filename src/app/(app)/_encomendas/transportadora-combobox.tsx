"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronsUpDown, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  TRANSPORTADORA_COMBOBOX_LABELS,
  TRANSPORTADORA_FIXA_OPTIONS,
} from "@/lib/labels"
import { offlineAwareErrorMessage } from "@/lib/network"
import { STALE_TIME_COM_REALTIME } from "@/lib/query-invalidation"
import {
  type CamposTransportadora,
  type SelecaoTransportadora,
  TRANSPORTADORA_NOME_MAX,
  TRANSPORTADORAS_QUERY_KEY,
  chaveTransportadora,
  normalizarNomeTransportadora,
  rotuloCamposTransportadora,
  selecaoParaCampos,
  termoJaExiste,
} from "@/lib/transportadoras"
import { cn } from "@/lib/utils"

import { createTransportadoraAction, listTransportadorasAction } from "./actions"

/**
 * Mesmo visual dos campos de texto do formulário (Input): altura 40px
 * (44px em tela de toque), borda arredondada e foco sólido.
 */
const TRIGGER_CLASSNAME =
  "flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-base transition-colors outline-none pointer-coarse:h-11 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"

/**
 * Transportadora do item: fixas (Correios, Amazon...) + nomes personalizados
 * já cadastrados no condomínio (J&T, Shein...). Um nome novo é salvo no
 * catálogo na hora ("Adicionar transportadora “X”") e fica disponível nas
 * próximas encomendas. No formulário continua valendo o contrato antigo:
 * fixa → { transportadora: valor, transportadoraOutro: "" };
 * personalizada → { transportadora: "outros", transportadoraOutro: nome }.
 *
 * Recebe id/aria-* do FormControl e repassa ao gatilho (rótulo e erro).
 */
export function TransportadoraCombobox({
  value,
  onChange,
  onBlur,
  placeholder = TRANSPORTADORA_COMBOBOX_LABELS.placeholder,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: {
  value: CamposTransportadora
  onChange: (campos: CamposTransportadora) => void
  onBlur?: () => void
  placeholder?: string
  id?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)
  const queryClient = useQueryClient()

  const { data: cadastradas } = useQuery({
    queryKey: TRANSPORTADORAS_QUERY_KEY,
    // Arrow function: o React Query passa um contexto (signal, client) que
    // server actions nao conseguem serializar — a chamada falharia em silencio.
    queryFn: () => listTransportadorasAction(),
    enabled: open,
    // Catalogo muda pouco; o proprio cadastro invalida a chave.
    staleTime: STALE_TIME_COM_REALTIME,
  })

  const chaveTermo = chaveTransportadora(search)
  const chavesFixas = new Set(
    TRANSPORTADORA_FIXA_OPTIONS.map((option) => chaveTransportadora(option.label))
  )
  // Defesa: um nome do catálogo igual a uma fixa não aparece duplicado.
  const listaCadastradas = (cadastradas ?? []).filter(
    (item) => !chavesFixas.has(chaveTransportadora(item.nome))
  )

  const fixasFiltradas = chaveTermo
    ? TRANSPORTADORA_FIXA_OPTIONS.filter((option) =>
        chaveTransportadora(option.label).includes(chaveTermo)
      )
    : TRANSPORTADORA_FIXA_OPTIONS
  const cadastradasFiltradas = chaveTermo
    ? listaCadastradas.filter((item) => chaveTransportadora(item.nome).includes(chaveTermo))
    : listaCadastradas

  const termoNormalizado = normalizarNomeTransportadora(search)
  const podeAdicionar =
    termoNormalizado.length > 0 &&
    termoNormalizado.length <= TRANSPORTADORA_NOME_MAX &&
    !termoJaExiste(
      termoNormalizado,
      listaCadastradas.map((item) => item.nome)
    )

  const rotuloAtual = rotuloCamposTransportadora(value)
  const chaveAtual = value.transportadora === "outros" ? chaveTransportadora(rotuloAtual) : ""

  function selecionar(selecao: SelecaoTransportadora) {
    onChange(selecaoParaCampos(selecao))
    setOpen(false)
    setSearch("")
  }

  async function handleCreate() {
    if (!podeAdicionar || creating) return

    setCreating(true)
    try {
      const result = await createTransportadoraAction(termoNormalizado)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      if (result.tipo === "fixa") {
        selecionar({ tipo: "fixa", valor: result.valor })
        return
      }

      await queryClient.invalidateQueries({ queryKey: TRANSPORTADORAS_QUERY_KEY })
      selecionar({ tipo: "personalizada", nome: result.transportadora.nome })
    } catch {
      toast.error(offlineAwareErrorMessage("Não foi possível cadastrar a transportadora."))
    } finally {
      setCreating(false)
    }
  }

  const nada = fixasFiltradas.length === 0 && cadastradasFiltradas.length === 0 && !podeAdicionar

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setSearch("")
          onBlur?.()
        }
      }}
    >
      <PopoverTrigger
        id={id}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        className={cn(TRIGGER_CLASSNAME, !rotuloAtual && "text-muted-foreground")}
      >
        <span className="truncate">{rotuloAtual || placeholder}</span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) min-w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={TRANSPORTADORA_COMBOBOX_LABELS.buscar}
            value={search}
            onValueChange={setSearch}
            maxLength={TRANSPORTADORA_NOME_MAX}
            autoFocus
          />
          {/* Lista mais alta e com barra de rolagem visivel: o CommandList
              padrao esconde a barra (no-scrollbar) e o porteiro nao percebia
              que havia mais opcoes abaixo das fixas. */}
          <CommandList scrollVisivel>
            {nada && (
              <CommandEmpty className="text-muted-foreground py-6 text-center text-sm">
                {TRANSPORTADORA_COMBOBOX_LABELS.vazio}
              </CommandEmpty>
            )}
            {/* Cadastradas pelo condominio primeiro: sao as que o porteiro
                mais precisa encontrar (as fixas ele ja conhece). */}
            {cadastradasFiltradas.length > 0 && (
              <CommandGroup heading={TRANSPORTADORA_COMBOBOX_LABELS.grupoCadastradas}>
                {cadastradasFiltradas.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`cadastrada:${item.id}`}
                    data-checked={
                      chaveAtual !== "" && chaveAtual === chaveTransportadora(item.nome)
                    }
                    onSelect={() => selecionar({ tipo: "personalizada", nome: item.nome })}
                  >
                    {item.nome}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {fixasFiltradas.length > 0 && (
              <CommandGroup heading={TRANSPORTADORA_COMBOBOX_LABELS.grupoFixas}>
                {fixasFiltradas.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`fixa:${option.value}`}
                    data-checked={value.transportadora === option.value}
                    onSelect={() => selecionar({ tipo: "fixa", valor: option.value })}
                  >
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {podeAdicionar && (
              <CommandGroup>
                <CommandItem
                  value="__adicionar__"
                  disabled={creating}
                  onSelect={() => void handleCreate()}
                >
                  <Plus />
                  {TRANSPORTADORA_COMBOBOX_LABELS.adicionar(termoNormalizado)}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

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
import { offlineAwareErrorMessage } from "@/lib/network"
import { cn } from "@/lib/utils"
import type { Remetente } from "@/types/domain"

import { createRemetenteAction, listRemetentesAction } from "./actions"

export function RemetenteCombobox({
  value,
  onChange,
  placeholder = "Selecione o remetente...",
}: {
  value: Remetente | null
  onChange: (remetente: Remetente) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)
  const queryClient = useQueryClient()

  const { data: remetentes } = useQuery({
    queryKey: ["remetentes"],
    queryFn: listRemetentesAction,
    enabled: open,
  })

  const list = remetentes ?? []
  const termo = search.trim().toLocaleLowerCase("pt-BR")
  const filtered = termo
    ? list.filter((remetente) =>
        remetente.nome.toLocaleLowerCase("pt-BR").includes(termo)
      )
    : list
  const jaExiste = list.some(
    (remetente) => remetente.nome.toLocaleLowerCase("pt-BR") === termo
  )

  async function handleCreate() {
    const nome = search.trim()
    if (!nome) return

    setCreating(true)
    try {
      const result = await createRemetenteAction(nome)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      await queryClient.invalidateQueries({ queryKey: ["remetentes"] })
      onChange(result.remetente)
      setOpen(false)
      setSearch("")
    } catch {
      toast.error(offlineAwareErrorMessage("Nao foi possivel cadastrar o remetente."))
    } finally {
      setCreating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "border-input bg-background flex h-9 w-full items-center justify-between rounded-md border px-3 text-sm",
          !value && "text-muted-foreground"
        )}
      >
        {value ? value.nome : placeholder}
        <ChevronsUpDown className="size-4 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar ou cadastrar remetente..."
            value={search}
            onValueChange={setSearch}
            autoFocus
          />
          <CommandList>
            {filtered.length === 0 && (
              <CommandEmpty className="text-muted-foreground py-6 text-center text-sm">
                Nenhum remetente encontrado.
              </CommandEmpty>
            )}
            <CommandGroup>
              {filtered.map((remetente) => (
                <CommandItem
                  key={remetente.id}
                  value={remetente.id}
                  onSelect={() => {
                    onChange(remetente)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  {remetente.nome}
                </CommandItem>
              ))}
              {search.trim() && !jaExiste && (
                <CommandItem
                  value="__criar__"
                  disabled={creating}
                  onSelect={() => void handleCreate()}
                >
                  <Plus />
                  Adicionar remetente &quot;{search.trim()}&quot;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

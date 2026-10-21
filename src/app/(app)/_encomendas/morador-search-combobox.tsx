"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { ChevronsUpDown, UserPlus } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { cn } from "@/lib/utils"
import type { Morador } from "@/types/domain"

import { listMoradoresAction } from "../moradores/actions"

export function MoradorSearchCombobox({
  value,
  onChange,
  onRequestCreate,
  onClear,
  placeholder = "Buscar morador...",
}: {
  value: Morador | null
  onChange: (morador: Morador) => void
  onRequestCreate?: (searchTerm: string) => void
  onClear?: () => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 250)

  const { data: moradores, isFetching } = useQuery({
    queryKey: ["moradores-combobox", debouncedSearch],
    queryFn: () => listMoradoresAction(debouncedSearch),
    enabled: open,
    placeholderData: keepPreviousData,
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "border-input bg-background flex h-9 w-full items-center justify-between rounded-md border px-3 text-sm",
          !value && "text-muted-foreground"
        )}
      >
        {value ? `${value.nome} · ${value.rua}, ${value.numero}` : placeholder}
        <ChevronsUpDown className="size-4 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nome ou rua..."
            value={search}
            onValueChange={setSearch}
            autoFocus
          />
          <CommandList>
            {isFetching && moradores === undefined && (
              <div className="space-y-1.5 p-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            )}
            {!isFetching && (moradores?.length ?? 0) === 0 && (
              <CommandEmpty className="flex flex-col items-center gap-2 py-6">
                <span className="text-muted-foreground text-sm">
                  Nenhum morador encontrado.
                </span>
                {onRequestCreate && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setOpen(false)
                      onRequestCreate(search)
                    }}
                  >
                    <UserPlus />
                    Cadastrar Morador
                  </Button>
                )}
              </CommandEmpty>
            )}
            <CommandGroup>
              {onClear && value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onClear()
                    setOpen(false)
                  }}
                >
                  <span className="text-muted-foreground">Todos os moradores</span>
                </CommandItem>
              )}
              {moradores?.map((morador) => (
                <CommandItem
                  key={morador.id}
                  value={morador.id}
                  onSelect={() => {
                    onChange(morador)
                    setOpen(false)
                  }}
                >
                  <div className="flex flex-col">
                    <span>{morador.nome}</span>
                    <span className="text-muted-foreground text-xs">
                      {morador.rua}, {morador.numero}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

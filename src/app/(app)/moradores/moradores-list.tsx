"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { offlineAwareErrorMessage } from "@/lib/network"
import { cn } from "@/lib/utils"
import type { Morador } from "@/types/domain"

import { deleteMoradorAction, listMoradoresAction } from "./actions"
import { MoradorFormDialog } from "./morador-form-dialog"

export function MoradoresList({
  initialMoradores,
  canManage,
}: {
  initialMoradores: Morador[]
  canManage: boolean
}) {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)

  const [formState, setFormState] = useState<
    { open: false } | { open: true; mode: "create" } | { open: true; mode: "edit"; morador: Morador }
  >({ open: false })

  const [moradorToDelete, setMoradorToDelete] = useState<Morador | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()

  const { data: moradores, refetch, isFetching } = useQuery({
    queryKey: ["moradores", debouncedSearch],
    queryFn: () => listMoradoresAction(debouncedSearch),
    initialData: debouncedSearch ? undefined : initialMoradores,
    placeholderData: keepPreviousData,
  })

  function handleDelete() {
    if (!moradorToDelete) return

    startDeleteTransition(async () => {
      try {
        const result = await deleteMoradorAction(moradorToDelete.id)

        if (!result.success) {
          toast.error(result.error)
          return
        }

        toast.success("Morador excluido.")
        setMoradorToDelete(null)
        void refetch()
      } catch {
        toast.error(offlineAwareErrorMessage("Nao foi possivel excluir o morador."))
      }
    })
  }

  const list = moradores ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          {isFetching ? (
            <Loader2 className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2 animate-spin" />
          ) : (
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          )}
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou rua..."
            className="pl-8"
            autoFocus
          />
        </div>
        <Button onClick={() => setFormState({ open: true, mode: "create" })}>
          <Plus />
          Novo morador
        </Button>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-lg border transition-opacity",
          isFetching && "opacity-60"
        )}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Rua</TableHead>
              <TableHead>Numero</TableHead>
              <TableHead>Observacoes</TableHead>
              {canManage && <TableHead className="w-0">Acoes</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 5 : 4}
                  className="text-muted-foreground h-24 text-center"
                >
                  Nenhum morador encontrado.
                </TableCell>
              </TableRow>
            )}
            {list.map((morador) => (
              <TableRow key={morador.id}>
                <TableCell className="font-medium">{morador.nome}</TableCell>
                <TableCell>{morador.rua}</TableCell>
                <TableCell>{morador.numero}</TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">
                  {morador.observacoes}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar morador"
                        onClick={() =>
                          setFormState({ open: true, mode: "edit", morador })
                        }
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Excluir morador"
                        className="hover:text-destructive"
                        onClick={() => setMoradorToDelete(morador)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <MoradorFormDialog
        open={formState.open}
        onOpenChange={(open) =>
          setFormState(open ? { open: true, mode: "create" } : { open: false })
        }
        mode={formState.open ? formState.mode : "create"}
        morador={formState.open && formState.mode === "edit" ? formState.morador : undefined}
        onSuccess={() => void refetch()}
      />

      <AlertDialog
        open={moradorToDelete !== null}
        onOpenChange={(open) => !open && setMoradorToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir morador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao remove {moradorToDelete?.nome} da lista de moradores.
              Nao sera possivel excluir se ja houver encomendas registradas
              para ele.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

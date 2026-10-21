"use client"

import { useQuery } from "@tanstack/react-query"
import { Pencil, Plus, Trash2 } from "lucide-react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { USUARIO_ROLE_LABELS } from "@/lib/labels"
import { offlineAwareErrorMessage } from "@/lib/network"
import type { UsuarioComEmail } from "@/types/domain"

import { deleteUsuarioAction, listUsuariosAction } from "./actions"
import { UsuarioFormDialog } from "./usuario-form-dialog"

export function UsuariosList({
  initialUsuarios,
  currentUserId,
}: {
  initialUsuarios: UsuarioComEmail[]
  currentUserId: string
}) {
  const [formState, setFormState] = useState<
    | { open: false }
    | { open: true; mode: "create" }
    | { open: true; mode: "edit"; usuario: UsuarioComEmail }
  >({ open: false })

  const [usuarioToDelete, setUsuarioToDelete] = useState<UsuarioComEmail | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()

  const { data: usuarios, refetch } = useQuery({
    queryKey: ["usuarios"],
    // Arrow function: o React Query passa um contexto (signal, client) que
    // server actions nao conseguem serializar — a chamada falharia em silencio.
    queryFn: () => listUsuariosAction(),
    initialData: initialUsuarios,
  })

  function handleDelete() {
    if (!usuarioToDelete) return

    startDeleteTransition(async () => {
      try {
        const result = await deleteUsuarioAction(usuarioToDelete.id)

        if (!result.success) {
          toast.error(result.error)
          return
        }

        toast.success("Usuario excluido.")
        setUsuarioToDelete(null)
        void refetch()
      } catch {
        toast.error(offlineAwareErrorMessage("Nao foi possivel excluir o usuario."))
      }
    })
  }

  const list = usuarios ?? []

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setFormState({ open: true, mode: "create" })}>
          <Plus />
          Novo usuario
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Funcao</TableHead>
              <TableHead className="w-0">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((usuario) => (
              <TableRow key={usuario.id}>
                <TableCell className="font-medium">
                  {usuario.nome}
                  {usuario.id === currentUserId && (
                    <span className="text-muted-foreground"> (voce)</span>
                  )}
                </TableCell>
                <TableCell>{usuario.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{USUARIO_ROLE_LABELS[usuario.role]}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Editar usuario"
                      onClick={() => setFormState({ open: true, mode: "edit", usuario })}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Excluir usuario"
                      className="hover:text-destructive"
                      disabled={usuario.id === currentUserId}
                      onClick={() => setUsuarioToDelete(usuario)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UsuarioFormDialog
        open={formState.open}
        onOpenChange={(open) =>
          setFormState(open ? { open: true, mode: "create" } : { open: false })
        }
        mode={formState.open ? formState.mode : "create"}
        usuario={formState.open && formState.mode === "edit" ? formState.usuario : undefined}
        onSuccess={() => void refetch()}
      />

      <AlertDialog
        open={usuarioToDelete !== null}
        onOpenChange={(open) => !open && setUsuarioToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao remove o acesso de {usuarioToDelete?.nome} ao sistema. Nao
              sera possivel excluir se ja houver encomendas registradas por ele.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive-solid"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

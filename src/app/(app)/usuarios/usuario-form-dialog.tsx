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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { USUARIO_ROLE_LABELS, USUARIO_ROLE_OPTIONS } from "@/lib/labels"
import { offlineAwareErrorMessage } from "@/lib/network"
import {
  type UsuarioCreateInput,
  type UsuarioUpdateInput,
  usuarioCreateSchema,
  usuarioUpdateSchema,
} from "@/schemas/usuario"
import type { Usuario, UsuarioComEmail } from "@/types/domain"

import { createUsuarioAction, updateUsuarioAction } from "./actions"

export function UsuarioFormDialog({
  open,
  onOpenChange,
  mode,
  usuario,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  usuario?: UsuarioComEmail
  onSuccess?: (usuario: Usuario) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {open &&
          (mode === "edit" && usuario ? (
            <UsuarioEditForm
              key={usuario.id}
              usuario={usuario}
              onOpenChange={onOpenChange}
              onSuccess={onSuccess}
            />
          ) : (
            <UsuarioCreateForm onOpenChange={onOpenChange} onSuccess={onSuccess} />
          ))}
      </DialogContent>
    </Dialog>
  )
}

function UsuarioCreateForm({
  onOpenChange,
  onSuccess,
}: {
  onOpenChange: (open: boolean) => void
  onSuccess?: (usuario: Usuario) => void
}) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<UsuarioCreateInput>({
    resolver: zodResolver(usuarioCreateSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { nome: "", email: "", senha: "", role: "porteiro" },
  })

  function onSubmit(values: UsuarioCreateInput) {
    startTransition(async () => {
      try {
        const result = await createUsuarioAction(values)

        if (!result.success) {
          toast.error(result.error)
          return
        }

        toast.success("Usuario cadastrado com sucesso.")
        onOpenChange(false)
        onSuccess?.(result.usuario)
      } catch {
        toast.error(offlineAwareErrorMessage("Nao foi possivel cadastrar o usuario."))
      }
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cadastrar usuario</DialogTitle>
        <DialogDescription>
          O usuario podera entrar com o email e a senha definidos aqui.
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
                  <Input autoFocus placeholder="Nome do usuario" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@exemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="senha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha inicial</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Funcao</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: keyof typeof USUARIO_ROLE_LABELS) => USUARIO_ROLE_LABELS[value]}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {USUARIO_ROLE_OPTIONS.map((option) => (
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

function UsuarioEditForm({
  usuario,
  onOpenChange,
  onSuccess,
}: {
  usuario: UsuarioComEmail
  onOpenChange: (open: boolean) => void
  onSuccess?: (usuario: Usuario) => void
}) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<UsuarioUpdateInput>({
    resolver: zodResolver(usuarioUpdateSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { nome: usuario.nome, role: usuario.role },
  })

  function onSubmit(values: UsuarioUpdateInput) {
    startTransition(async () => {
      try {
        const result = await updateUsuarioAction(usuario.id, values)

        if (!result.success) {
          toast.error(result.error)
          return
        }

        toast.success("Usuario atualizado.")
        onOpenChange(false)
        onSuccess?.(result.usuario)
      } catch {
        toast.error(offlineAwareErrorMessage("Nao foi possivel atualizar o usuario."))
      }
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar usuario</DialogTitle>
        <DialogDescription>{usuario.email}</DialogDescription>
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
                  <Input autoFocus placeholder="Nome do usuario" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Funcao</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: keyof typeof USUARIO_ROLE_LABELS) => USUARIO_ROLE_LABELS[value]}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {USUARIO_ROLE_OPTIONS.map((option) => (
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

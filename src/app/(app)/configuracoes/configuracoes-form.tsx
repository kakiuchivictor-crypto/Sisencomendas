"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTheme } from "next-themes"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import { offlineAwareErrorMessage } from "@/lib/network"
import { type CondominioInput, condominioSchema } from "@/schemas/condominio"
import type { Condominio } from "@/types/domain"

import { updateCondominioAction } from "./actions"

export function ConfiguracoesForm({ condominio }: { condominio: Condominio }) {
  const [isPending, startTransition] = useTransition()
  const { setTheme } = useTheme()

  const form = useForm<CondominioInput>({
    resolver: zodResolver(condominioSchema),
    defaultValues: { nome: condominio.nome, tema: condominio.tema },
  })

  function onSubmit(values: CondominioInput) {
    startTransition(async () => {
      try {
        const result = await updateCondominioAction(values)

        if (!result.success) {
          toast.error(result.error)
          return
        }

        toast.success("Configuracoes atualizadas.")
        setTheme(values.tema === "escuro" ? "dark" : "light")
      } catch {
        toast.error(offlineAwareErrorMessage("Nao foi possivel salvar as configuracoes."))
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-lg space-y-5">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do condominio</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tema"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tema padrao</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: "claro" | "escuro") =>
                        value === "claro" ? "Claro" : "Escuro"
                      }
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="claro">Claro</SelectItem>
                  <SelectItem value="escuro">Escuro</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar configuracoes"}
        </Button>
      </form>
    </Form>
  )
}

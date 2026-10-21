"use client"

import {
  type Control,
  type FieldPath,
  type FieldValues,
  type PathValue,
  useController,
} from "react-hook-form"

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import type { Transportadora } from "@/lib/labels"

import { TransportadoraCombobox } from "./transportadora-combobox"

/**
 * Campo "Transportadora" dos formulários de encomenda (cadastro, edição e
 * adicionar item). Um único combobox controla os dois campos do schema
 * (`transportadora` e `transportadoraOutro`). O FormField fica no
 * `transportadoraOutro` porque é ali que o schema coloca o erro
 * "Informe o nome da transportadora" (caso de registro legado com
 * 'outros' sem nome) — a mensagem aparece logo abaixo do combobox.
 */
export function TransportadoraField<T extends FieldValues>({
  control,
  transportadoraName,
  transportadoraOutroName,
}: {
  control: Control<T>
  transportadoraName: FieldPath<T>
  transportadoraOutroName: FieldPath<T>
}) {
  const { field: transportadoraField } = useController({
    control,
    name: transportadoraName,
  })

  return (
    <FormField
      control={control}
      name={transportadoraOutroName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Transportadora</FormLabel>
          <FormControl>
            <TransportadoraCombobox
              value={{
                transportadora: transportadoraField.value as Transportadora,
                transportadoraOutro: (field.value as string | undefined) ?? "",
              }}
              onChange={(campos) => {
                transportadoraField.onChange(
                  campos.transportadora as PathValue<T, FieldPath<T>>
                )
                field.onChange(campos.transportadoraOutro as PathValue<T, FieldPath<T>>)
              }}
              onBlur={field.onBlur}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

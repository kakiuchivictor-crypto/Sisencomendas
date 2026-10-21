"use client"

import { useId } from "react"
import type { Control, FieldPath, FieldValues } from "react-hook-form"

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { IDENTIFICACAO_LABELS } from "@/lib/labels"
import { cn } from "@/lib/utils"

/**
 * Campos "Codigo de rastreio" + "Nota fiscal" de um item (encomenda ou
 * correspondencia), com a regra fixa de pelo menos um dos dois (ver
 * src/schemas/identificacao.ts). O erro do schema cai no campo de rastreio;
 * a NF declara `deps` no rastreio para o erro sumir assim que o porteiro
 * digita a nota fiscal. O grupo e descrito pela dica (aria-describedby).
 *
 * `obrigatorio = false` so na edicao de registros legados que nunca tiveram
 * NF/rastreio: ai os campos voltam a aparecer como opcionais.
 */
export function IdentificacaoFields<T extends FieldValues>({
  control,
  rastreioName,
  notaFiscalName,
  obrigatorio = true,
  className,
}: {
  control: Control<T>
  rastreioName: FieldPath<T>
  notaFiscalName: FieldPath<T>
  obrigatorio?: boolean
  className?: string
}) {
  const dicaId = useId()

  return (
    <div
      role="group"
      aria-label="Identificação do item"
      aria-describedby={dicaId}
      className={cn("space-y-2", className)}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          control={control}
          name={rastreioName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {IDENTIFICACAO_LABELS.codigoRastreio}
                {!obrigatorio && <OpcionalHint />}
              </FormLabel>
              <FormControl>
                <Input placeholder="Ex: BR123456789BR" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={notaFiscalName}
          rules={{ deps: [rastreioName] }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {IDENTIFICACAO_LABELS.notaFiscal}
                {!obrigatorio && <OpcionalHint />}
              </FormLabel>
              <FormControl>
                <Input placeholder="Número da NF" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <p
        id={dicaId}
        className={cn("text-muted-foreground text-xs", !obrigatorio && "sr-only")}
      >
        {obrigatorio
          ? IDENTIFICACAO_LABELS.dica
          : "Registro antigo sem nota fiscal nem rastreio: campos opcionais."}
      </p>
    </div>
  )
}

function OpcionalHint() {
  return <span className="text-muted-foreground text-xs font-normal">opcional</span>
}

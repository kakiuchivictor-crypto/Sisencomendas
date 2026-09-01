"use client"

import { Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Stepper "- [n] +" usado em todo formulario de cadastro de encomenda/
 * correspondencia (criar, editar, adicionar item) — centraliza o clamp
 * min/max e o teclado numerico, que antes estava duplicado em cada form.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 999,
  className,
  inputClassName,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  className?: string
  inputClassName?: string
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Diminuir quantidade"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus />
      </Button>
      <Input
        type="number"
        min={min}
        max={max}
        className={cn("text-center font-mono tabular-nums", inputClassName)}
        value={value}
        onChange={(event) => {
          const parsed = Number(event.target.value)
          onChange(Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : min)
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Aumentar quantidade"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus />
      </Button>
    </div>
  )
}

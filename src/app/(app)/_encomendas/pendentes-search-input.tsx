"use client"

import { Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function PendentesSearchInput({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar por morador ou rua…"
        aria-label="Buscar por morador, rua ou número"
        className="h-11 pl-9"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Limpar busca"
          className="absolute top-1/2 right-1.5 -translate-y-1/2 pointer-coarse:right-0.5 pointer-coarse:size-10"
          onClick={() => onChange("")}
        >
          <X />
        </Button>
      )}
    </div>
  )
}

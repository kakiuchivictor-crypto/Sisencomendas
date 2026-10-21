"use client"

import { useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { invalidarListaInfinita } from "@/lib/query-invalidation"

import { EncomendaFormDialog } from "./encomenda-form-dialog"

export function NovaEncomendaButton() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  return (
    <>
      <Button size="lg" aria-label="Nova encomenda" onClick={() => setOpen(true)}>
        <Plus />
        <span>
          Nova<span className="hidden sm:inline"> encomenda</span>
        </span>
      </Button>

      <EncomendaFormDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
        onSuccess={() => {
          void queryClient.invalidateQueries({
            queryKey: ["encomendas-pendentes", "encomenda"],
          })
          void queryClient.invalidateQueries({ queryKey: ["cards-stats", "encomenda"] })
          void queryClient.invalidateQueries({ queryKey: ["nav-counts"] })
          void invalidarListaInfinita(queryClient, ["encomendas-historico"])
        }}
      />
    </>
  )
}

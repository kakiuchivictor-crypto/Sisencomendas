"use client"

import { useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"

import { CorrespondenciaFormDialog } from "./correspondencia-form-dialog"

export function NovaCorrespondenciaButton() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        <Plus />
        Nova correspondência
      </Button>

      <CorrespondenciaFormDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => {
          void queryClient.invalidateQueries({
            queryKey: ["encomendas-pendentes", "correspondencia"],
          })
          void queryClient.invalidateQueries({
            queryKey: ["cards-stats", "correspondencia"],
          })
          void queryClient.invalidateQueries({ queryKey: ["nav-counts"] })
        }}
      />
    </>
  )
}

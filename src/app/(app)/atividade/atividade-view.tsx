"use client"

import { useQuery } from "@tanstack/react-query"
import { FileText } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/format"
import { LOG_ACAO_LABELS } from "@/lib/labels"
import { cn } from "@/lib/utils"
import type { LogAtividade } from "@/types/domain"

import { listAtividadeAction, type LogFiltersInput } from "./actions"
import { exportToPdf } from "./export"

export function AtividadeView({ initialLogs }: { initialLogs: LogAtividade[] }) {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [term, setTerm] = useState("")

  const filters: LogFiltersInput = {
    from: from || undefined,
    to: to || undefined,
    term: term.trim() || undefined,
  }

  const hasFilters = Boolean(filters.from || filters.to || filters.term)

  const { data, isFetching } = useQuery({
    queryKey: ["atividade", filters],
    queryFn: () => listAtividadeAction(filters),
    initialData: hasFilters ? undefined : initialLogs,
    placeholderData: (previous) => previous,
  })

  const logs = data ?? initialLogs

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="from">De</Label>
            <input
              id="from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">Ate</Label>
            <input
              id="to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="term">Buscar</Label>
            <Input
              id="term"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Usuario ou descricao..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {isFetching ? "Atualizando..." : `${logs.length} registro(s) encontrado(s)`}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={logs.length === 0}
          onClick={() => void exportToPdf(logs)}
        >
          <FileText />
          Exportar PDF
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
              <TableHead>Data/hora</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Acao</TableHead>
              <TableHead>Descricao</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            )}
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">
                  {formatDateTime(log.createdAt)}
                </TableCell>
                <TableCell className="font-medium">{log.usuarioNome}</TableCell>
                <TableCell>{LOG_ACAO_LABELS[log.acao]}</TableCell>
                <TableCell>{log.descricao}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

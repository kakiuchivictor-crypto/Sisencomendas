"use client"

import { useQuery } from "@tanstack/react-query"
import { FileSpreadsheet, FileText, X } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate, formatDateTime, formatDurationSeconds } from "@/lib/format"
import {
  TIPO_ENCOMENDA_LABELS,
  TRANSPORTADORA_LABELS,
  TRANSPORTADORA_OPTIONS,
  transportadoraLabel,
} from "@/lib/labels"
import { cn } from "@/lib/utils"
import type { Morador } from "@/types/domain"

import { MoradorSearchCombobox } from "../_encomendas/morador-search-combobox"
import { getReportAction, type ReportFiltersInput, type ReportResult } from "./actions"
import { exportToExcel, exportToPdf } from "./export"

export function RelatorioView({ initialResult }: { initialResult: ReportResult }) {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [transportadora, setTransportadora] = useState<string>("todas")
  const [morador, setMorador] = useState<Morador | null>(null)
  const [status, setStatus] = useState<string>("todos")

  const filters: ReportFiltersInput = {
    from: from || undefined,
    to: to || undefined,
    transportadora:
      transportadora === "todas"
        ? undefined
        : (transportadora as ReportFiltersInput["transportadora"]),
    moradorId: morador?.id,
    status:
      status === "todos" ? undefined : (status as ReportFiltersInput["status"]),
  }

  const hasFilters = Boolean(
    filters.from || filters.to || filters.transportadora || filters.moradorId || filters.status
  )

  function handleClearFilters() {
    setFrom("")
    setTo("")
    setTransportadora("todas")
    setMorador(null)
    setStatus("todos")
  }

  const { data, isFetching } = useQuery({
    queryKey: ["relatorio", filters],
    queryFn: () => getReportAction(filters),
    initialData: hasFilters ? undefined : initialResult,
    placeholderData: (previous) => previous,
  })

  const result = data ?? initialResult
  const list = result.encomendas

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>
            Combine periodo, transportadora, morador e status para refinar o relatorio.
          </CardDescription>
          {hasFilters && (
            <CardAction>
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                <X />
                Limpar filtros
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="from">De</Label>
            <input
              id="from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            />
            {!from && result.fromAplicado && (
              <p className="text-muted-foreground text-xs">
                Sem filtro: mostrando desde {formatDate(result.fromAplicado)}.
              </p>
            )}
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
            <Label>Transportadora</Label>
            <Select
              value={transportadora}
              onValueChange={(value) => setTransportadora(value ?? "todas")}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) =>
                    value === "todas"
                      ? "Todas"
                      : TRANSPORTADORA_LABELS[
                          value as keyof typeof TRANSPORTADORA_LABELS
                        ]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {TRANSPORTADORA_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Morador</Label>
            <MoradorSearchCombobox
              value={morador}
              onChange={setMorador}
              onClear={() => setMorador(null)}
              placeholder="Todos os moradores"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value ?? "todos")}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) =>
                    value === "todos"
                      ? "Todos"
                      : value === "pendente"
                        ? "Pendentes"
                        : "Entregues"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="entregue">Entregues</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total no periodo</CardDescription>
            <CardTitle className="font-mono text-3xl font-semibold tabular-nums">
              {list.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pendentes</CardDescription>
            <CardTitle className="font-mono text-3xl font-semibold tabular-nums">
              {result.totalPendentes}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Entregues</CardDescription>
            <CardTitle className="font-mono text-3xl font-semibold tabular-nums">
              {result.totalEntregues}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tempo medio de retirada</CardDescription>
            <CardTitle className="font-mono text-2xl font-semibold tabular-nums">
              {result.tempoMedioSegundos !== null
                ? formatDurationSeconds(result.tempoMedioSegundos)
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {isFetching ? "Atualizando..." : `${list.length} encomenda(s) encontrada(s)`}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={list.length === 0}
            onClick={() => void exportToPdf(list)}
          >
            <FileText />
            Exportar PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={list.length === 0}
            onClick={() => void exportToExcel(list)}
          >
            <FileSpreadsheet />
            Exportar Excel
          </Button>
        </div>
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
              <TableHead>Morador</TableHead>
              <TableHead>Endereco</TableHead>
              <TableHead>Transportadora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead>Rastreio</TableHead>
              <TableHead>NF</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recebida em</TableHead>
              <TableHead>Recebida por</TableHead>
              <TableHead>Entregue em</TableHead>
              <TableHead>Entregue por</TableHead>
              <TableHead>Retirado por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="text-muted-foreground h-24 text-center">
                  Nenhuma encomenda no periodo selecionado.
                </TableCell>
              </TableRow>
            )}
            {list.map((encomenda) => (
              <TableRow key={encomenda.id}>
                <TableCell className="font-medium">{encomenda.moradorNome}</TableCell>
                <TableCell>
                  {encomenda.rua}, {encomenda.numero}
                </TableCell>
                <TableCell>
                  {transportadoraLabel(encomenda.transportadora, encomenda.transportadoraOutro)}
                </TableCell>
                <TableCell>{TIPO_ENCOMENDA_LABELS[encomenda.tipo]}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {encomenda.quantidade}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {encomenda.codigoRastreio ?? "-"}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {encomenda.notaFiscal ?? "-"}
                </TableCell>
                <TableCell>
                  {encomenda.status === "pendente" ? "Pendente" : "Entregue"}
                </TableCell>
                <TableCell>{formatDateTime(encomenda.recebidaEm)}</TableCell>
                <TableCell>{encomenda.recebidaPorNome}</TableCell>
                <TableCell>
                  {encomenda.entregueEm ? formatDateTime(encomenda.entregueEm) : "-"}
                </TableCell>
                <TableCell>{encomenda.entreguePorNome ?? "-"}</TableCell>
                <TableCell>{encomenda.retiradoPor ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

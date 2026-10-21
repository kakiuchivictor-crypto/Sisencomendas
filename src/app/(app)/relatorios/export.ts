import { formatDateTime } from "@/lib/format"
import { TIPO_ENCOMENDA_LABELS, transportadoraLabel } from "@/lib/labels"
import { neutralizarFormula } from "@/lib/planilha"
import type { EncomendaComDetalhes } from "@/types/domain"

const COLUMNS = [
  "Morador",
  "Endereço",
  "Transportadora",
  "Tipo",
  "Qtd.",
  "Rastreio",
  "NF",
  "Status",
  "Recebida em",
  "Recebida por",
  "Entregue em",
  "Entregue por",
  "Retirado por",
]

/**
 * `texto` trata os campos de texto livre (digitados por usuarios): no Excel
 * neutraliza formulas; no PDF fica como esta. Rotulos fixos, numeros, datas
 * e o marcador "-" nunca passam por ele.
 */
function rowsFrom(
  encomendas: EncomendaComDetalhes[],
  texto: (valor: string) => string = (valor) => valor
): string[][] {
  const opcional = (valor: string | null) => (valor === null ? "-" : texto(valor))

  return encomendas.map((encomenda) => [
    texto(encomenda.moradorNome),
    texto(`${encomenda.rua}, ${encomenda.numero}`),
    texto(transportadoraLabel(encomenda.transportadora, encomenda.transportadoraOutro)),
    TIPO_ENCOMENDA_LABELS[encomenda.tipo],
    String(encomenda.quantidade),
    opcional(encomenda.codigoRastreio),
    opcional(encomenda.notaFiscal),
    encomenda.status === "pendente" ? "Pendente" : "Entregue",
    formatDateTime(encomenda.recebidaEm),
    texto(encomenda.recebidaPorNome),
    encomenda.entregueEm ? formatDateTime(encomenda.entregueEm) : "-",
    opcional(encomenda.entreguePorNome),
    opcional(encomenda.retiradoPor),
  ])
}

export async function exportToPdf(encomendas: EncomendaComDetalhes[]): Promise<void> {
  // jspdf/jspdf-autotable so sao baixadas quando alguem realmente exporta —
  // evita carregar essas libs pesadas so pra abrir a pagina de relatorios.
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ])

  // Paisagem: 13 colunas nao cabem legiveis num A4 retrato (210mm) — o
  // autoTable espremia texto (nomes cortados/quebrados). Em paisagem
  // (297mm) da pra dar largura explicita pra cada coluna sem espremer.
  const doc = new jsPDF({ orientation: "landscape" })

  doc.setFontSize(14)
  doc.text("Relatório de Encomendas", 14, 15)
  doc.setFontSize(9)
  doc.text(`Gerado em ${formatDateTime(new Date())}`, 14, 21)

  autoTable(doc, {
    startY: 26,
    head: [COLUMNS],
    body: rowsFrom(encomendas),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 30, 30] },
    // So os nomes (que estavam sendo espremidos/cortados) ganham largura
    // minima garantida — o resto continua com largura automatica, que o
    // autoTable distribui proporcionalmente pro espaco que sobra na pagina.
    columnStyles: {
      0: { cellWidth: 32 }, // Morador
      9: { cellWidth: 24 }, // Recebida por
      11: { cellWidth: 24 }, // Entregue por
      12: { cellWidth: 24 }, // Retirado por
    },
  })

  doc.save(`relatorio-encomendas-${Date.now()}.pdf`)
}

export async function exportToExcel(encomendas: EncomendaComDetalhes[]): Promise<void> {
  const { default: ExcelJS } = await import("exceljs")
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Encomendas")

  sheet.columns = COLUMNS.map((header) => ({ header, key: header, width: 24 }))
  rowsFrom(encomendas, neutralizarFormula).forEach((row) => sheet.addRow(row))
  sheet.getRow(1).font = { bold: true }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `relatorio-encomendas-${Date.now()}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}

import { formatDateTime } from "@/lib/format"
import { LOG_ACAO_LABELS } from "@/lib/labels"
import type { LogAtividade } from "@/types/domain"

const COLUMNS = ["Data/hora", "Usuário", "Ação", "Descrição"]

function rowsFrom(logs: LogAtividade[]): string[][] {
  return logs.map((log) => [
    formatDateTime(log.createdAt),
    log.usuarioNome,
    LOG_ACAO_LABELS[log.acao],
    log.descricao,
  ])
}

export async function exportToPdf(logs: LogAtividade[]): Promise<void> {
  // jspdf/jspdf-autotable so sao baixadas quando alguem realmente exporta —
  // evita carregar essas libs pesadas so pra abrir a pagina de atividade.
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ])

  const doc = new jsPDF()

  doc.setFontSize(14)
  doc.text("Log de Atividade", 14, 15)
  doc.setFontSize(9)
  doc.text(`Gerado em ${formatDateTime(new Date())}`, 14, 21)

  autoTable(doc, {
    startY: 26,
    head: [COLUMNS],
    body: rowsFrom(logs),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 30, 30] },
    columnStyles: { 3: { cellWidth: 90 } },
  })

  doc.save(`log-atividade-${Date.now()}.pdf`)
}

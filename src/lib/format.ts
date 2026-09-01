const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
})

export function formatDate(date: Date | string): string {
  return dateFormatter.format(new Date(date))
}

export function formatTime(date: Date | string): string {
  return timeFormatter.format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`
}

/** Quantos dias inteiros ja se passaram desde `date`. */
export function diasDesde(date: Date | string): number {
  const diffMs = Date.now() - new Date(date).getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export function formatDurationSince(date: Date | string): string {
  const diffMs = Date.now() - new Date(date).getTime()
  const diffDays = diasDesde(date)

  if (diffDays >= 1) {
    return `ha ${diffDays} dia${diffDays > 1 ? "s" : ""}`
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffHours >= 1) {
    return `ha ${diffHours}h`
  }

  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)))

  return `ha ${diffMinutes}min`
}

export function formatDurationSeconds(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (days === 0 && minutes > 0) parts.push(`${minutes}min`)

  return parts.length > 0 ? parts.join(" ") : "menos de 1min"
}

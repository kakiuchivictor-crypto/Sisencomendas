import { cn } from "@/lib/utils"

/** Pilula com o numero de pendentes ao lado do rotulo da aba. */
export function NavCount({
  value,
  active = false,
  className,
}: {
  value: number
  active?: boolean
  className?: string
}) {
  if (value <= 0) return null

  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 font-mono text-[0.7rem] leading-none font-semibold tabular-nums",
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        className
      )}
    >
      {value > 99 ? "99+" : value}
      <span className="sr-only"> pendentes</span>
    </span>
  )
}

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Blocos de skeleton usados pelos loading.tsx das rotas de (app). Cada bloco
 * imita as medidas da tela real (alturas de input/botao, grade dos cards,
 * linhas da lista) para a troca skeleton -> conteudo nao empurrar a pagina.
 * Header e barra inferior ficam no layout e nao passam por aqui.
 */

/** Envoltorio comum: anuncia o carregamento para leitores de tela. */
export function SkeletonPage({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">Carregando…</span>
      {children}
    </div>
  )
}

/**
 * Titulo e descricao da pagina. O titulo e fixo (texto real, ja conhecido),
 * entao aparece na hora; so a descricao vira barra quando depende de dados.
 */
export function PageTitle({
  title,
  description,
  descriptionSkeletonWidth,
}: {
  title: string
  description?: string
  /** Quando informado, a descricao vira uma barra desta largura (ex.: "w-72"). */
  descriptionSkeletonWidth?: string
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {description ? (
        <p className="text-muted-foreground text-sm">{description}</p>
      ) : (
        <Skeleton
          className={cn("my-0.5 h-4 max-w-full", descriptionSkeletonWidth ?? "w-64")}
        />
      )}
    </div>
  )
}

/** Campo de busca (h-10; h-11 em toque) ou botao grande (h-11). */
export function InputSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-10 rounded-lg pointer-coarse:h-11", className)} />
}

export function ButtonLgSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-11 w-24 rounded-lg sm:w-40", className)} />
}

/** Faixa de 4 indicadores da tela de Pendentes (mesma grade de StatCards). */
export function StatCardsSkeleton() {
  const cellClassName =
    "flex min-w-0 flex-col gap-1 border-border px-4 py-3.5 sm:px-5 [&:nth-child(n+3)]:border-t md:[&:nth-child(n+3)]:border-t-0 [&:nth-child(even)]:border-l md:[&:not(:first-child)]:border-l"

  return (
    <Card className="grid grid-cols-2 gap-0 py-0 md:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className={cellClassName}>
          <Skeleton className="my-0.5 h-3 w-24" />
          <Skeleton className="my-1 h-7 w-12 sm:h-8" />
        </div>
      ))}
    </Card>
  )
}

/** Chips de filtro acima da lista de Pendentes. */
export function FilterChipsSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden pb-1">
      {["w-20", "w-36", "w-32", "w-20"].map((width, index) => (
        <Skeleton
          key={index}
          className={cn("h-9 shrink-0 rounded-full pointer-coarse:h-11", width)}
        />
      ))}
    </div>
  )
}

/** Linhas da lista de pendentes (mesma grade/padding de PendentesList). */
export function PendentesRowsSkeleton({ rows = 6 }: { rows?: number }) {
  const rowGrid =
    "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_7.5rem_14rem] md:gap-4 md:pr-4 md:pl-5"

  return (
    <Card className="gap-0 py-0">
      <div className={cn("hidden h-9 items-center border-b md:grid", rowGrid)}>
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="ml-auto h-3 w-10" />
      </div>
      <ul>
        {Array.from({ length: rows }, (_, index) => (
          <li
            key={index}
            className={cn(
              "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2.5 border-b px-4 py-3.5 last:border-b-0 md:min-h-17 md:items-center md:py-2.5",
              rowGrid
            )}
          >
            <div className="order-1 flex min-w-0 items-center gap-3 md:order-none">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-36 max-w-full" />
                <Skeleton className="h-3.5 w-28 max-w-full" />
              </div>
            </div>
            <div className="order-3 col-span-2 min-w-0 space-y-1.5 pl-11 md:order-none md:col-span-1 md:pl-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3.5 w-32 max-w-full" />
            </div>
            <div className="order-2 flex flex-col items-end gap-1 md:order-none md:items-start">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="order-4 col-span-2 flex items-center gap-1 md:order-none md:col-span-1 md:justify-end">
              <Skeleton className="size-11 shrink-0 rounded-lg md:size-8" />
              <Skeleton className="h-11 flex-1 rounded-lg md:w-28 md:flex-none" />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** Cards de lote (Entregues, Historico, Correspondencia entregue). */
export function DetalheCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} className="border-l-4 border-l-muted">
          <div className="space-y-2 px-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-28" />
            </div>
            <div className="rounded-md border px-2.5 py-2">
              <Skeleton className="h-3 w-3/4" />
            </div>
            <Skeleton className="h-3 w-1/2" />
          </div>
        </Card>
      ))}
    </div>
  )
}

/** Tabela simples (Moradores, Usuarios, Atividade, Relatorios). */
export function TableSkeleton({
  columns,
  rows = 8,
}: {
  columns: number
  rows?: number
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex h-10 items-center gap-4 border-b px-2">
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} className="h-3.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className="flex h-[2.85rem] items-center gap-4 border-b px-2 last:border-b-0"
        >
          {Array.from({ length: columns }, (_, col) => (
            <Skeleton key={col} className={cn("h-4 flex-1", col === 0 && "max-w-48")} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Card de filtros (Relatorios/Atividade): titulo + N campos. */
export function FiltersCardSkeleton({
  fields,
  className,
}: {
  fields: number
  /** Grade dos campos (ex.: "sm:grid-cols-2 lg:grid-cols-5"). */
  className?: string
}) {
  return (
    <Card>
      <div className="space-y-1.5 px-4">
        <Skeleton className="h-5 w-16" />
      </div>
      <div className={cn("grid grid-cols-1 gap-4 px-4", className)}>
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="space-y-1.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    </Card>
  )
}

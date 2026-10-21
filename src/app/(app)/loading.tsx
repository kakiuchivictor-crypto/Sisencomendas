import {
  ButtonLgSkeleton,
  FilterChipsSkeleton,
  PageTitle,
  PendentesRowsSkeleton,
  SkeletonPage,
  StatCardsSkeleton,
} from "@/components/layout/page-skeletons"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Fallback da tela de Pendentes ("/") e, por estar na raiz do grupo (app),
 * de qualquer rota sem loading.tsx proprio. Aparece na hora do toque na aba
 * (o header e a barra inferior continuam no layout) enquanto o servidor
 * monta a pagina.
 */
export default function PendentesLoading() {
  return (
    <SkeletonPage className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle
          title="Pendentes"
          description="Encomendas aguardando retirada pelo morador."
        />
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Skeleton className="h-11 min-w-0 flex-1 rounded-lg sm:w-64 sm:flex-none" />
          <ButtonLgSkeleton />
        </div>
      </div>
      <StatCardsSkeleton />
      <div className="space-y-3">
        <FilterChipsSkeleton />
        <PendentesRowsSkeleton />
      </div>
    </SkeletonPage>
  )
}

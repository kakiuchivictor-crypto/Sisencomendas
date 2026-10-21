import {
  FiltersCardSkeleton,
  PageTitle,
  SkeletonPage,
  TableSkeleton,
} from "@/components/layout/page-skeletons"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function RelatoriosLoading() {
  return (
    <SkeletonPage className="space-y-6">
      <PageTitle
        title="Relatórios"
        description="Analise encomendas por período, transportadora ou morador."
      />
      <div className="space-y-6">
        <FiltersCardSkeleton fields={5} className="sm:grid-cols-2 lg:grid-cols-5" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index}>
              <div className="space-y-2 px-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-16" />
              </div>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-28 rounded-lg pointer-coarse:h-11" />
            <Skeleton className="h-7 w-28 rounded-lg pointer-coarse:h-11" />
          </div>
        </div>
        <TableSkeleton columns={6} rows={6} />
      </div>
    </SkeletonPage>
  )
}

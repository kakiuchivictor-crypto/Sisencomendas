import {
  FiltersCardSkeleton,
  PageTitle,
  SkeletonPage,
  TableSkeleton,
} from "@/components/layout/page-skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function AtividadeLoading() {
  return (
    <SkeletonPage className="space-y-6">
      <PageTitle
        title="Atividade"
        description="Histórico de ações realizadas pelos usuários do sistema."
      />
      <div className="space-y-6">
        <FiltersCardSkeleton fields={3} className="sm:grid-cols-3" />
        <Skeleton className="h-4 w-40" />
        <TableSkeleton columns={4} />
      </div>
    </SkeletonPage>
  )
}

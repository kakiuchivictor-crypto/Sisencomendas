import {
  InputSkeleton,
  PageTitle,
  SkeletonPage,
  TableSkeleton,
} from "@/components/layout/page-skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function MoradoresLoading() {
  return (
    <SkeletonPage className="space-y-6">
      {/* A descrição depende do perfil (pode ou não editar): fica como barra. */}
      <PageTitle title="Moradores" descriptionSkeletonWidth="w-80" />
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <InputSkeleton className="flex-1" />
          <Skeleton className="h-8 w-36 rounded-lg pointer-coarse:h-11" />
        </div>
        <TableSkeleton columns={4} />
      </div>
    </SkeletonPage>
  )
}

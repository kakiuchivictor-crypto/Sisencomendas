import {
  DetalheCardsSkeleton,
  InputSkeleton,
  PageTitle,
  SkeletonPage,
} from "@/components/layout/page-skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function HistoricoLoading() {
  return (
    <SkeletonPage className="space-y-6">
      <PageTitle
        title="Histórico"
        description="Pesquise em todas as encomendas já registradas."
      />
      <div className="space-y-4">
        <InputSkeleton />
        <div className="flex flex-wrap gap-1.5">
          {["w-14", "w-14", "w-16", "w-16"].map((width, index) => (
            <Skeleton
              key={index}
              className={`h-7 rounded-lg pointer-coarse:h-11 ${width}`}
            />
          ))}
        </div>
        <DetalheCardsSkeleton />
      </div>
    </SkeletonPage>
  )
}

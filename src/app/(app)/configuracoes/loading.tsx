import { PageTitle, SkeletonPage } from "@/components/layout/page-skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function ConfiguracoesLoading() {
  return (
    <SkeletonPage className="space-y-6">
      <PageTitle
        title="Configurações"
        description="Personalize o nome e o tema padrão do condomínio."
      />
      <div className="max-w-lg space-y-5">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-10 w-full rounded-lg pointer-coarse:h-11" />
          </div>
        ))}
        <Skeleton className="h-8 w-24 rounded-lg pointer-coarse:h-11" />
      </div>
    </SkeletonPage>
  )
}

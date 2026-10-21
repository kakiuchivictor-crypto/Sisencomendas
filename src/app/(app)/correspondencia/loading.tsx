import {
  ButtonLgSkeleton,
  DetalheCardsSkeleton,
  InputSkeleton,
  PageTitle,
  PendentesRowsSkeleton,
  SkeletonPage,
} from "@/components/layout/page-skeletons"

export default function CorrespondenciaLoading() {
  return (
    <SkeletonPage className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle
          title="Correspondência"
          description="Cartas registradas para os moradores, separadas das encomendas."
        />
        <ButtonLgSkeleton />
      </div>
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Pendentes</h2>
        <div className="space-y-3">
          <InputSkeleton className="h-11" />
          <PendentesRowsSkeleton rows={3} />
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Entregues</h2>
        <DetalheCardsSkeleton count={2} />
      </div>
    </SkeletonPage>
  )
}

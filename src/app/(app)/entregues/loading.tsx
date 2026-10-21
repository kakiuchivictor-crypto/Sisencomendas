import {
  DetalheCardsSkeleton,
  PageTitle,
  SkeletonPage,
} from "@/components/layout/page-skeletons"

export default function EntreguesLoading() {
  return (
    <SkeletonPage className="space-y-6">
      <PageTitle title="Entregues" description="Encomendas já entregues aos moradores." />
      <DetalheCardsSkeleton />
    </SkeletonPage>
  )
}

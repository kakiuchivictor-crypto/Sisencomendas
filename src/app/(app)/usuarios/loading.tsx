import {
  PageTitle,
  SkeletonPage,
  TableSkeleton,
} from "@/components/layout/page-skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function UsuariosLoading() {
  return (
    <SkeletonPage className="space-y-6">
      <PageTitle
        title="Usuários"
        description="Gerencie administradores e porteiros com acesso ao sistema."
      />
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-8 w-36 rounded-lg pointer-coarse:h-11" />
        </div>
        <TableSkeleton columns={4} rows={4} />
      </div>
    </SkeletonPage>
  )
}

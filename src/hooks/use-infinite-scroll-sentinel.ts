import { useEffect, useRef } from "react"

/**
 * Sentinela pra paginacao por scroll continuo (troca o botao "Carregar mais"
 * por um IntersectionObserver) — melhor em tablet/celular, onde e mais
 * natural rolar do que mirar num botao pequeno no fim da lista.
 */
export function useInfiniteScrollSentinel({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  hasNextPage: boolean | undefined
  isFetchingNextPage: boolean
  onLoadMore: () => void
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          onLoadMore()
        }
      },
      { rootMargin: "200px" }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, onLoadMore])

  return sentinelRef
}

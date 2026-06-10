import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Syncs page number to URL search params.
 * Survives F5 refresh and back button navigation.
 *
 * Usage:
 *   const { page, setPage } = useUrlPagination()
 */
export function useUrlPagination(paramName = 'page') {
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(1, parseInt(searchParams.get(paramName) ?? '1', 10))

  const setPage = useCallback(
    (p: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (p <= 1) {
            next.delete(paramName)
          } else {
            next.set(paramName, String(p))
          }
          return next
        },
        { replace: true },
      )
    },
    [paramName, setSearchParams],
  )

  return { page, setPage }
}

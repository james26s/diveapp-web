'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'

export function useSearch() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const query = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const sortBy = searchParams.get('sort') ?? 'recent'

  const setParams = useCallback(
    (params: Record<string, string | null>) => {
      const current = new URLSearchParams(searchParams.toString())

      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === '') {
          current.delete(key)
        } else {
          current.set(key, value)
        }
      })

      const search = current.toString()
      router.push(search ? `${pathname}?${search}` : pathname)
    },
    [searchParams, router, pathname]
  )

  return { query, category, sortBy, setParams }
}

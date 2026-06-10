import { useState, useEffect } from 'react'

/**
 * Debounces a value — useful for search inputs to reduce API calls.
 * @param value  The value to debounce
 * @param delay  Delay in ms (default 300ms)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}

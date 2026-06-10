import { useAuthStore } from '@/store/auth.store'

export function usePermission(key: string): boolean {
  return useAuthStore((s) => s.hasPermission(key))
}

export function useHasAnyPermission(keys: string[]): boolean {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  return keys.some(hasPermission)
}

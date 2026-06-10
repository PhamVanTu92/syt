/**
 * Lightweight toast hook — shows a temporary notification.
 * Wraps a global event-based system to avoid circular imports.
 *
 * Usage:
 *   const toast = useToast()
 *   toast.success('Đã lưu thành công')
 *   toast.error('Có lỗi xảy ra')
 */
import { useCallback } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastEvent {
  type: ToastType
  message: string
  duration?: number
}

export function dispatchToast(event: ToastEvent) {
  window.dispatchEvent(new CustomEvent('app:toast', { detail: event }))
}

export function useToast() {
  const success = useCallback((message: string) => dispatchToast({ type: 'success', message }), [])
  const error = useCallback((message: string) => dispatchToast({ type: 'error', message }), [])
  const info = useCallback((message: string) => dispatchToast({ type: 'info', message }), [])
  const warning = useCallback((message: string) => dispatchToast({ type: 'warning', message }), [])
  return { success, error, info, warning }
}

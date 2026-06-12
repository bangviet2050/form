import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Chờ sửa',
    repairing: 'Đang sửa',
    completed: 'Xong',
    returned: 'Đã trả máy',
  }
  return labels[status] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    repairing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    returned: 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Get date part (YYYY-MM-DD) in Vietnam timezone (GMT+7).
 * Used for date inputs.
 */
export function toVietnamDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/**
 * Get time part (HH:mm) in Vietnam timezone (GMT+7), 24-hour format.
 * Used for time inputs.
 */
export function toVietnamTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value || ''
  return `${get('hour')}:${get('minute')}`
}

/**
 * Format a date in Vietnam timezone (GMT+7) as "dd/MM/yyyy HH:mm"
 */
export function formatVietnamDateTime(date: string | Date | null): string {
  if (!date) return '-'
  const d = new Date(date)
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const get = (type: string) => parts.find(p => p.type === type)?.value || ''
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`
}

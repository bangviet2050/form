import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { eq, and, inArray } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import BulkPrintClient from './bulk-client'

export const dynamic = 'force-dynamic'

interface BulkPrintPageProps {
  searchParams: Promise<{ ids?: string }>
}

function formatVietnamDate(date: string | Date | null | undefined) {
  if (!date) return '-'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

function formatVietnamDateTime(date: string | Date | null | undefined) {
  if (!date) return '-'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
}

function formatCurrencyVND(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return '-'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = { pending: 'Chờ sửa', repairing: 'Đang sửa', completed: 'Đã xong', returned: 'Đã trả máy' }
  return map[status] || status
}

export default async function BulkPrintPage({ searchParams: sp }: BulkPrintPageProps) {
  const session = await getSession()
  if (!session) redirect('/sign-in')

  const params = await sp
  const idsParam = params.ids
  if (!idsParam) notFound()

  const ids = idsParam.split(',').map(Number).filter(n => !Number.isNaN(n))
  if (ids.length === 0) notFound()

  const whereCondition = session.user.role === 'admin'
    ? inArray(customers.id, ids)
    : and(inArray(customers.id, ids), eq(customers.userId, session.user.id))

  const results = await db.select().from(customers).where(whereCondition)
  if (results.length === 0) notFound()

  const printedAt = formatVietnamDateTime(new Date())

  const invoices = results.map(c => ({
    ticketId: c.ticketId,
    customerName: c.customerName,
    phone: c.phone,
    receivedDate: formatVietnamDate(c.receivedDate),
    deviceType: c.deviceType,
    deviceModel: c.deviceModel || '-',
    accessories: c.accessories || '-',
    conditionBefore: c.conditionBefore || '-',
    conditionAfter: c.conditionAfter || '-',
    repairCost: formatCurrencyVND(c.repairCost),
    receivedBy: c.receivedBy || '-',
    repairedBy: c.repairedBy || '-',
    status: getStatusLabel(c.status),
    returnedDate: formatVietnamDate(c.returnedDate),
    printedAt,
    notes: c.notes || '',
  }))

  return <BulkPrintClient invoices={invoices} />
}

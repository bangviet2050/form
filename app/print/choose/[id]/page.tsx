import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { eq, and } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import ChooseClient from './choose-client'

export const dynamic = 'force-dynamic'

interface ChoosePageProps {
  params: Promise<{ id: string }>
}

function formatVietnamDate(date: string | Date | null | undefined) {
  if (!date) return '-'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(d)
}

function formatVietnamDateTime(date: string | Date | null | undefined) {
  if (!date) return '-'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d)
}

function formatCurrencyVND(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return '-'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: 'Chờ sửa', repairing: 'Đang sửa', completed: 'Đã xong', returned: 'Đã trả máy',
  }
  return map[status] || status
}

export default async function ChoosePage({ params }: ChoosePageProps) {
  let session
  try {
    session = await getSession()
  } catch {
    redirect('/sign-in')
  }

  if (!session) redirect('/sign-in')

  const { id } = await params
  const customerId = Number.parseInt(id, 10)
  if (Number.isNaN(customerId)) notFound()

  let customer
  try {
    const whereCondition = session.user.role === 'admin'
      ? eq(customers.id, customerId)
      : and(eq(customers.id, customerId), eq(customers.userId, session.user.id))

    const result = await db.select().from(customers).where(whereCondition).limit(1)
    customer = result[0]
  } catch {
    throw new Error('Không thể tải dữ liệu. Vui lòng thử lại sau.')
  }

  if (!customer) notFound()

  const printedAt = formatVietnamDateTime(new Date())

  const allData = {
    id: customer.id,
    ticketId: customer.ticketId,
    customerName: customer.customerName,
    phone: customer.phone,
    receivedDate: formatVietnamDate(customer.receivedDate),
    deviceType: customer.deviceType,
    deviceModel: customer.deviceModel || '',
    accessories: customer.accessories || '',
    conditionBefore: customer.conditionBefore || '',
    conditionAfter: customer.conditionAfter || '',
    repairCost: formatCurrencyVND(customer.repairCost),
    receivedBy: customer.receivedBy || '',
    repairedBy: customer.repairedBy || '',
    status: getStatusLabel(customer.status),
    returnedDate: formatVietnamDate(customer.returnedDate),
    printedAt,
    notes: customer.notes || '',
  }

  return <ChooseClient data={allData} />
}

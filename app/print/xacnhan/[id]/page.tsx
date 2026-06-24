import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { eq, and } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import XacNhanClient from './xacnhan-client'

export const dynamic = 'force-dynamic'

interface XacNhanPageProps {
  params: Promise<{ id: string }>
}

function formatVietnamDate(date: string | Date | null | undefined) {
  if (!date) return '...'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '...'
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(d)
}

export default async function XacNhanPage({ params }: XacNhanPageProps) {
  let session
  try {
    session = await getSession()
  } catch (error) {
    console.error('[XacNhanPage] getSession error:', error)
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
  } catch (error) {
    console.error('[XacNhanPage] Database query error:', error)
    throw new Error('Không thể tải dữ liệu phiếu. Vui lòng thử lại sau.')
  }

  if (!customer) notFound()

  const formData = {
    ticketId: customer.ticketId,
    customerName: customer.customerName,
    phone: customer.phone,
    receivedDate: formatVietnamDate(customer.receivedDate),
    deviceType: customer.deviceType,
    deviceModel: customer.deviceModel || '',
    accessories: customer.accessories || '',
    conditionBefore: customer.conditionBefore || '',
    receivedBy: customer.receivedBy || '',
  }

  return <XacNhanClient data={formData} />
}

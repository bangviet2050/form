import type { CSSProperties } from 'react'
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { eq, and } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import PrintClient from './print-client'

export const dynamic = 'force-dynamic'

interface PrintInvoicePageProps {
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

/* ── Paper size configs ── */
const PAPER_CONFIGS: Record<string, {
  label: string; size: string; maxWidth: string; padding: string; margin: string;
  titleSize: string; sectionSize: string; cellSize: string; nameSize: string; cellPad: string; labelWidth: string;
}> = {
  A4: {
    label: 'A4', size: 'A4', maxWidth: '210mm', padding: '10mm 12mm', margin: '10mm',
    titleSize: '18px', sectionSize: '12px', cellSize: '12px', nameSize: '16px',
    cellPad: '6px 8px', labelWidth: '32%',
  },
  A5: {
    label: 'A5', size: 'A5', maxWidth: '148mm', padding: '6mm 7mm', margin: '5mm',
    titleSize: '14px', sectionSize: '10px', cellSize: '10px', nameSize: '14px',
    cellPad: '3px 5px', labelWidth: '35%',
  },
  A6: {
    label: 'A6', size: 'A6', maxWidth: '105mm', padding: '4mm 5mm', margin: '4mm',
    titleSize: '11px', sectionSize: '8px', cellSize: '8px', nameSize: '11px',
    cellPad: '2px 3px', labelWidth: '36%',
  },
  A7: {
    label: 'A7', size: 'A7', maxWidth: '74mm', padding: '3mm 3mm', margin: '3mm',
    titleSize: '9px', sectionSize: '7px', cellSize: '7px', nameSize: '9px',
    cellPad: '1px 2px', labelWidth: '38%',
  },
}

export default async function PrintInvoicePage({ params }: PrintInvoicePageProps) {
  const session = await getSession()
  if (!session) redirect('/sign-in')

  const { id } = await params
  const customerId = Number.parseInt(id, 10)
  if (Number.isNaN(customerId)) notFound()

  const whereCondition = session.user.role === 'admin'
    ? eq(customers.id, customerId)
    : and(eq(customers.id, customerId), eq(customers.userId, session.user.id))

  const result = await db.select().from(customers).where(whereCondition).limit(1)
  const customer = result[0]
  if (!customer) notFound()

  const printedAt = formatVietnamDateTime(new Date())

  // Pass all data + configs to client component
  const invoiceData = {
    ticketId: customer.ticketId,
    customerName: customer.customerName,
    phone: customer.phone,
    receivedDate: formatVietnamDate(customer.receivedDate),
    deviceType: customer.deviceType,
    deviceModel: customer.deviceModel || '-',
    accessories: customer.accessories || '-',
    conditionBefore: customer.conditionBefore || '-',
    conditionAfter: customer.conditionAfter || '-',
    repairCost: formatCurrencyVND(customer.repairCost),
    receivedBy: customer.receivedBy || '-',
    repairedBy: customer.repairedBy || '-',
    status: getStatusLabel(customer.status),
    returnedDate: formatVietnamDate(customer.returnedDate),
    printedAt,
    notes: customer.notes || '',
  }

  return <PrintClient data={invoiceData} />
}

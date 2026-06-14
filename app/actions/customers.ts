'use server'

import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity } from '@/app/actions/activity-log'
import { customers, user } from '@/lib/db/schema'
import { and, desc, eq, gte, ilike, lte, or, count, sum, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

async function requireAuth() {
  const result = await getSession()
  if (!result?.user) {
    throw new Error('Unauthorized')
  }
  if (result.user.status === 'deleted' || result.user.status === 'rejected') {
    throw new Error('Tài khoản không còn hợp lệ')
  }
  return result.user
}

async function getUserId() {
  const user = await requireAuth()
  return user.id
}

async function getUserRole() {
  const user = await requireAuth()
  return { userId: user.id, role: user.role }
}

type StatusHistoryEntry = {
  status: string
  date: string
  by: string
}

function parseStatusHistory(statusHistory?: string | null): StatusHistoryEntry[] {
  if (!statusHistory) {
    return []
  }

  try {
    const parsed = JSON.parse(statusHistory)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter(
        (entry): entry is StatusHistoryEntry =>
          entry &&
          typeof entry === 'object' &&
          typeof entry.status === 'string' &&
          typeof entry.date === 'string' &&
          typeof entry.by === 'string'
      )
      .map((entry) => ({
        status: entry.status,
        date: entry.date,
        by: entry.by,
      }))
  } catch {
    return []
  }
}

function toStartOfDay(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function toEndOfDay(dateString: string) {
  const date = new Date(`${dateString}T23:59:59.999`)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function createCustomer(data: {
  customerName: string
  phone: string
  receivedDate: string
  deviceType: string
  deviceModel?: string
  accessories?: string
  conditionBefore?: string
  conditionAfter?: string
  receivedBy?: string
  repairedBy?: string
  repairCost?: string | null
  notes?: string
  status?: string
  returnedDate?: string | null
}) {
  const user = await requireAuth()

  const ticketId = String(10000 + Math.floor(Math.random() * 90000))

  const result = await db
    .insert(customers)
    .values({
      userId: user.id,
      ticketId,
      customerName: data.customerName,
      phone: data.phone,
      receivedDate: new Date(data.receivedDate),
      deviceType: data.deviceType,
      deviceModel: data.deviceModel || null,
      accessories: data.accessories || null,
      conditionBefore: data.conditionBefore || null,
      conditionAfter: data.conditionAfter || null,
      receivedBy: data.receivedBy || null,
      repairedBy: data.repairedBy || null,
      repairCost: data.repairCost !== undefined && data.repairCost !== '' && data.repairCost !== null ? data.repairCost : null,
      notes: data.notes || null,
      status: data.status || 'pending',
      statusHistory: JSON.stringify([
        {
          status: data.status || 'pending',
          date: new Date().toISOString(),
          by: user.name || '',
        },
      ]),
      returnedDate: data.returnedDate ? new Date(data.returnedDate) : null,
    })
    .returning()

  await logActivity(
    user.id,
    user.name,
    'create_order',
    `#${result[0].ticketId}`,
    `${data.customerName} - ${data.deviceType}`
  )

  revalidatePath('/dashboard')
  revalidatePath('/admin')
  return { ...result[0], ticketId }
}

export async function getCustomers(
  search?: string,
  sortBy: 'recent' | 'name' = 'recent',
  page: number = 1,
  limit?: number,
  status?: string,
  dateFrom?: string,
  dateTo?: string,
  viewAll?: boolean,
  staffName?: string
) {
  const { userId, role } = await getUserRole()

  // Admin with viewAll sees all orders; otherwise only own orders
  const conditions: any[] = []
  if (!(role === 'admin' && viewAll === true)) {
    conditions.push(eq(customers.userId, userId))
  }

  if (search) {
    conditions.push(
      or(
        ilike(customers.customerName, `%${search}%`),
        ilike(customers.phone, `%${search}%`),
        ilike(customers.ticketId, `%${search}%`)
      )!
    )
  }

  if (status) {
    conditions.push(eq(customers.status, status))
  }

  if (dateFrom) {
    const startDate = toStartOfDay(dateFrom)
    if (startDate) {
      conditions.push(gte(customers.receivedDate, startDate))
    }
  }

  if (dateTo) {
    const endDate = toEndOfDay(dateTo)
    if (endDate) {
      conditions.push(lte(customers.receivedDate, endDate))
    }
  }

  if (staffName) {
    // Filter by the user account that created the order
    const [staffUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.name, staffName), eq(user.status, 'approved')))
      .limit(1)
    if (staffUser) {
      conditions.push(eq(customers.userId, staffUser.id))
    } else {
      // Fallback: no matching user found, match nothing
      conditions.push(sql`1 = 0`)
    }
  }

  const whereClause = and(...conditions)

  const orderBy =
    sortBy === 'recent'
      ? desc(customers.createdAt)
      : customers.customerName

  const usePagination = typeof limit === 'number' && limit > 0
  const pageSize = limit ?? 0

  // Single query with window function — avoids separate count query
  const rows = await db
    .select({
      id: customers.id,
      userId: customers.userId,
      ticketId: customers.ticketId,
      customerName: customers.customerName,
      phone: customers.phone,
      receivedDate: customers.receivedDate,
      deviceType: customers.deviceType,
      deviceModel: customers.deviceModel,
      accessories: customers.accessories,
      conditionBefore: customers.conditionBefore,
      conditionAfter: customers.conditionAfter,
      receivedBy: customers.receivedBy,
      repairedBy: customers.repairedBy,
      repairCost: customers.repairCost,
      notes: customers.notes,
      status: customers.status,
      statusHistory: customers.statusHistory,
      returnedDate: customers.returnedDate,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
      totalCount: sql<number>`count(*) over()`,
    })
    .from(customers)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(usePagination ? pageSize : 999999)
    .offset(usePagination ? (page - 1) * pageSize : 0)

  const totalCount = Number((rows[0] as any)?.totalCount || 0)
  const totalPages = usePagination ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1

  // Strip totalCount from rows for clean data
  const data = rows.map(({ totalCount: _, ...rest }) => rest)

  return {
    data,
    totalPages,
    page,
    totalCount,
  }
}

export async function getCustomerStaffNames(viewAll?: boolean) {
  const { userId, role } = await getUserRole()
  const canViewAll = role === 'admin' && viewAll === true

  if (!canViewAll) {
    // Non-admin: return only their own name
    const [self] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId))
    return self?.name ? [self.name] : []
  }

  // Admin: return all active staff accounts (exclude admins)
  const rows = await db
    .select({ name: user.name, id: user.id })
    .from(user)
    .where(and(eq(user.status, 'approved'), eq(user.role, 'staff')))
    .orderBy(user.name)

  return rows
    .filter((r) => r.name?.trim())
    .map((r) => r.name!.trim())
    .sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }))
}

export async function updateCustomer(
  id: number,
  data: {
    customerName?: string
    phone?: string
    receivedDate?: string
    deviceType?: string
    deviceModel?: string
    accessories?: string
    conditionBefore?: string
    conditionAfter?: string
    receivedBy?: string
    repairedBy?: string
    repairCost?: string | null
    notes?: string
    status?: string
    returnedDate?: string | null
    returnedTime?: string | null
  }
) {
  const user = await requireAuth()
  const userId = user.id
  const isAdmin = user.role === 'admin'

  const updates: any = {}
  const changedFields: string[] = []
  if (data.customerName !== undefined) {
    updates.customerName = data.customerName
    changedFields.push('customerName')
  }
  if (data.phone !== undefined) {
    updates.phone = data.phone
    changedFields.push('phone')
  }
  if (data.receivedDate !== undefined) {
    updates.receivedDate = new Date(data.receivedDate)
    changedFields.push('receivedDate')
  }
  if (data.deviceType !== undefined) {
    updates.deviceType = data.deviceType
    changedFields.push('deviceType')
  }
  if (data.deviceModel !== undefined) {
    updates.deviceModel = data.deviceModel
    changedFields.push('deviceModel')
  }
  if (data.accessories !== undefined) {
    updates.accessories = data.accessories
    changedFields.push('accessories')
  }
  if (data.conditionBefore !== undefined) {
    updates.conditionBefore = data.conditionBefore
    changedFields.push('conditionBefore')
  }
  if (data.conditionAfter !== undefined) {
    updates.conditionAfter = data.conditionAfter
    changedFields.push('conditionAfter')
  }
  if (data.receivedBy !== undefined) {
    updates.receivedBy = data.receivedBy
    changedFields.push('receivedBy')
  }
  if (data.repairedBy !== undefined) {
    updates.repairedBy = data.repairedBy
    changedFields.push('repairedBy')
  }
  if (data.repairCost !== undefined) {
    updates.repairCost = data.repairCost !== undefined && data.repairCost !== '' && data.repairCost !== null ? data.repairCost : null
    changedFields.push('repairCost')
  }
  if (data.notes !== undefined) {
    updates.notes = data.notes
    changedFields.push('notes')
  }
  if (data.status !== undefined) {
    updates.status = data.status
    changedFields.push('status')
  }
  if (data.returnedDate !== undefined) {
    const returnedDateTime = data.returnedDate
      ? data.returnedTime
        ? `${data.returnedDate}T${data.returnedTime}:00+07:00`
        : data.returnedDate
      : null
    updates.returnedDate = returnedDateTime ? new Date(returnedDateTime) : null
    changedFields.push('returnedDate')
  }
  updates.updatedAt = new Date()

  const existing = await db
    .select()
    .from(customers)
    .where(isAdmin ? eq(customers.id, id) : and(eq(customers.id, id), eq(customers.userId, userId)))
    .limit(1)

  if (existing.length === 0) {
    return null
  }

  const currentCustomer = existing[0]

  if (data.status !== undefined) {
    updates.status = data.status

    const statusHistory = parseStatusHistory(currentCustomer.statusHistory)
    if (statusHistory.length === 0 || statusHistory[statusHistory.length - 1]?.status !== data.status) {
      statusHistory.push({
        status: data.status,
        date: new Date().toISOString(),
        by: user.name || '',
      })
      updates.statusHistory = JSON.stringify(statusHistory)
    }
  }

  const result = await db
    .update(customers)
    .set(updates)
    .where(eq(customers.id, id))
    .returning()

  await logActivity(
    user.id,
    user.name,
    'update_order',
    `#${existing[0].ticketId}`,
    changedFields.join(', ')
  )

  revalidatePath('/dashboard')
  revalidatePath('/admin')
  return result[0] || null
}

export async function deleteCustomer(id: number) {
  const user = await requireAuth()
  const userId = user.id
  const isAdmin = user.role === 'admin'

  await db
    .delete(customers)
    .where(isAdmin ? eq(customers.id, id) : and(eq(customers.id, id), eq(customers.userId, userId)))

  await logActivity(user.id, user.name, 'delete_order', `id:${id}`)

  revalidatePath('/dashboard')
  revalidatePath('/admin')
}

export async function getCustomerStats(viewAll?: boolean, staffName?: string) {
  const { userId, role } = await getUserRole()

  // Build where clause
  let whereClause
  if (staffName && role === 'admin') {
    // Filter by specific staff user
    const [staffUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.name, staffName), eq(user.status, 'approved')))
      .limit(1)
    whereClause = staffUser ? eq(customers.userId, staffUser.id) : sql`1 = 0`
  } else if (role === 'admin' && viewAll === true) {
    whereClause = undefined
  } else {
    whereClause = eq(customers.userId, userId)
  }

  const rows = await db
    .select({
      total: count(),
      pending: sum(sql`CASE WHEN ${customers.status} = 'pending' THEN 1 ELSE 0 END`),
      repairing: sum(sql`CASE WHEN ${customers.status} = 'repairing' THEN 1 ELSE 0 END`),
      completed: sum(sql`CASE WHEN ${customers.status} = 'completed' THEN 1 ELSE 0 END`),
      returned: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN 1 ELSE 0 END`),
      totalRevenue: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN ${customers.repairCost} ELSE 0 END`),
    })
    .from(customers)
    .where(whereClause)

  const r = rows[0]
  return {
    totalCustomers: Number(r?.total || 0),
    pending: Number(r?.pending || 0),
    repairing: Number(r?.repairing || 0),
    completed: Number(r?.completed || 0),
    returned: Number(r?.returned || 0),
    totalRevenue: Number(r?.totalRevenue || 0),
    totalRepairs: Number(r?.total || 0),
  }
}

export async function getExistingCustomers() {
  await requireAuth()

  const result = await db.execute(sql`
    SELECT DISTINCT ON (customername, phone)
      customername AS "customerName",
      phone AS "phone"
    FROM customers
    ORDER BY customername, phone
  `)

  return result.rows as { customerName: string; phone: string }[]
}

export async function getCustomerHistory(customerName: string, phone: string) {
  await requireAuth()

  // Lịch sử sửa máy chung — tất cả đều thấy, kèm tên người tạo
  const { user } = await import('@/lib/db/schema')
  return db
    .select({
      id: customers.id,
      ticketId: customers.ticketId,
      customerName: customers.customerName,
      phone: customers.phone,
      receivedDate: customers.receivedDate,
      deviceType: customers.deviceType,
      deviceModel: customers.deviceModel,
      accessories: customers.accessories,
      conditionBefore: customers.conditionBefore,
      conditionAfter: customers.conditionAfter,
      receivedBy: customers.receivedBy,
      repairedBy: customers.repairedBy,
      repairCost: customers.repairCost,
      notes: customers.notes,
      status: customers.status,
      statusHistory: customers.statusHistory,
      returnedDate: customers.returnedDate,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
      userId: customers.userId,
      staffName: user.name,
    })
    .from(customers)
    .leftJoin(user, eq(customers.userId, user.id))
    .where(
      and(
        eq(customers.customerName, customerName),
        eq(customers.phone, phone)
      )
    )
    .orderBy(desc(customers.createdAt))
}

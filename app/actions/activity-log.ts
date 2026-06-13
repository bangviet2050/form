'use server'

import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { activityLog, user } from '@/lib/db/schema'
import { desc, eq, and, gte, lte, count, sql } from 'drizzle-orm'

export type ActionType =
  | 'create_order'
  | 'update_order'
  | 'delete_order'
  | 'approve_user'
  | 'reject_user'
  | 'delete_user'
  | 'add_option'
  | 'delete_option'
  | 'update_option'
  | 'change_role'
  | 'toggle_permission'
  | 'export_report'
  | 'export_excel'

export async function logActivity(
  userId: string,
  userName: string | null,
  action: ActionType,
  target?: string,
  details?: string
) {
  try {
    await db.insert(activityLog).values({
      userId,
      userName: userName || null,
      action,
      target: target || null,
      details: details || null,
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}

async function requireAdminOrLogsPerm() {
  const result = await getSession()
  if (!result?.user) {
    throw new Error('Unauthorized')
  }
  if (result.user.role === 'admin') return { user: result.user, isStaff: false }
  // Check if staff has logs tab permission
  try {
    const perms = result.user.permissions ? JSON.parse(result.user.permissions) : {}
    if (perms?.tabs?.logs) return { user: result.user, isStaff: true }
  } catch {}
  throw new Error('Chỉ admin mới có thể thực hiện thao tác này')
}

async function requireAdmin() {
  const result = await getSession()
  if (!result?.user || result.user.role !== 'admin') {
    throw new Error('Chỉ admin mới có thể thực hiện thao tác này')
  }
  return result.user
}

export async function getActivityLogs(
  page: number = 1,
  limit: number = 20,
  actionFilter?: string,
  userIdFilter?: string,
  dateFrom?: string,
  dateTo?: string,
  staffName?: string
) {
  const { user: caller, isStaff } = await requireAdminOrLogsPerm()

  const conditions: any[] = []

  // Staff can only see their own logs
  if (isStaff) {
    conditions.push(eq(activityLog.userId, caller.id))
  }

  if (actionFilter) {
    conditions.push(eq(activityLog.action, actionFilter))
  }

  if (userIdFilter && !isStaff) {
    conditions.push(eq(activityLog.userId, userIdFilter))
  }

  // Filter by staff name (admin only)
  if (staffName && !isStaff) {
    if (staffName === '__mine__') {
      conditions.push(eq(activityLog.userId, caller.id))
    } else {
      const [staffUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.name, staffName), eq(user.status, 'approved')))
        .limit(1)
      if (staffUser) {
        conditions.push(eq(activityLog.userId, staffUser.id))
      } else {
        conditions.push(sql`1 = 0`)
      }
    }
  }

  if (dateFrom) {
    const d = new Date(`${dateFrom}T00:00:00`)
    if (!Number.isNaN(d.getTime())) {
      conditions.push(gte(activityLog.createdAt, d))
    }
  }

  if (dateTo) {
    const d = new Date(`${dateTo}T23:59:59.999`)
    if (!Number.isNaN(d.getTime())) {
      conditions.push(lte(activityLog.createdAt, d))
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const totalResult = await db
    .select({ total: count() })
    .from(activityLog)
    .where(whereClause)

  const totalCount = Number(totalResult[0]?.total || 0)
  const totalPages = Math.max(1, Math.ceil(totalCount / limit))

  const data = await db
    .select()
    .from(activityLog)
    .where(whereClause)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)

  return { data, totalPages, page, totalCount }
}

export async function deleteAllLogs() {
  const admin = await requireAdmin()
  void admin

  await db.delete(activityLog)
}

export async function getActivityStats(staffName?: string) {
  const { user: caller, isStaff } = await requireAdminOrLogsPerm()

  let staffFilter: any = isStaff ? eq(activityLog.userId, caller.id) : undefined

  // Admin filter by staff name
  if (!isStaff && staffName) {
    if (staffName === '__mine__') {
      staffFilter = eq(activityLog.userId, caller.id)
    } else {
      const [staffUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.name, staffName), eq(user.status, 'approved')))
        .limit(1)
      staffFilter = staffUser ? eq(activityLog.userId, staffUser.id) : sql`1 = 0`
    }
  }

  // Get total count
  const totalResult = await db
    .select({ total: count() })
    .from(activityLog)
    .where(staffFilter)

  // Get counts by action type
  const actionCounts = await db
    .select({
      action: activityLog.action,
      count: count(),
    })
    .from(activityLog)
    .where(staffFilter)
    .groupBy(activityLog.action)

  return {
    total: Number(totalResult[0]?.total || 0),
    byAction: actionCounts.reduce((acc: Record<string, number>, row: any) => {
      acc[row.action] = Number(row.count)
      return acc
    }, {}),
  }
}

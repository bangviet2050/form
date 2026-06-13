'use server'

import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { activityLog } from '@/lib/db/schema'
import { desc, eq, and, gte, lte, count } from 'drizzle-orm'

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
  dateTo?: string
) {
  const admin = await requireAdmin()
  void admin

  const conditions: any[] = []

  if (actionFilter) {
    conditions.push(eq(activityLog.action, actionFilter))
  }

  if (userIdFilter) {
    conditions.push(eq(activityLog.userId, userIdFilter))
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

export async function getActivityStats() {
  const admin = await requireAdmin()
  void admin

  // Get total count
  const totalResult = await db
    .select({ total: count() })
    .from(activityLog)

  // Get counts by action type
  const actionCounts = await db
    .select({
      action: activityLog.action,
      count: count(),
    })
    .from(activityLog)
    .groupBy(activityLog.action)

  return {
    total: Number(totalResult[0]?.total || 0),
    byAction: actionCounts.reduce((acc: Record<string, number>, row: any) => {
      acc[row.action] = Number(row.count)
      return acc
    }, {}),
  }
}

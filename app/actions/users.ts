'use server'

import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { user, session, customers } from '@/lib/db/schema'
import { logActivity } from '@/app/actions/activity-log'
import { type StaffPermissions } from '@/lib/permissions'
import { eq, ne, desc, count, sql, and, like, or, gte, lte, sum } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const result = await getSession()
  if (!result?.user || result.user.role !== 'admin') {
    throw new Error('Chỉ admin mới có thể thực hiện hành động này')
  }
  return result.user
}

export async function getUsers() {
  await requireAdmin()

  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      canAddOptions: user.canAddOptions,
      permissions: user.permissions,
      avatar: user.avatar,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(ne(user.status, 'deleted'))
    .orderBy(desc(user.createdAt))

  return users
}

export async function getUserStats() {
  await requireAdmin()

  // Single query with conditional aggregation instead of 4 separate queries
  const rows = await db
    .select({
      total: count(),
      pending: sum(sql`CASE WHEN ${user.status} = 'pending' THEN 1 ELSE 0 END`),
      approved: sum(sql`CASE WHEN ${user.status} = 'approved' THEN 1 ELSE 0 END`),
      staff: sum(sql`CASE WHEN ${user.role} = 'staff' THEN 1 ELSE 0 END`),
    })
    .from(user)

  const r = rows[0]
  return {
    total: Number(r?.total || 0),
    pending: Number(r?.pending || 0),
    approved: Number(r?.approved || 0),
    staff: Number(r?.staff || 0),
  }
}

export async function approveUser(userId: string) {
  const admin = await requireAdmin()

  await db
    .update(user)
    .set({ status: 'approved', updatedAt: new Date() })
    .where(eq(user.id, userId))

  void logActivity(admin.id, admin.name, 'approve_user', userId, 'Approved user')

  revalidatePath('/admin')
  return { success: true }
}

export async function rejectUser(userId: string) {
  const admin = await requireAdmin()

  await db
    .update(user)
    .set({ status: 'rejected', updatedAt: new Date() })
    .where(eq(user.id, userId))

  void logActivity(admin.id, admin.name, 'reject_user', userId, 'Rejected user')

  // Delete all sessions for this user so they get kicked out
  await db.delete(session).where(eq(session.userId, userId))

  revalidatePath('/admin')
  return { success: true }
}

export async function changeUserRole(userId: string, role: 'admin' | 'staff') {
  const admin = await requireAdmin()

  // Don't allow changing own role
  if (userId === admin.id) {
    throw new Error('Không thể thay đổi vai trò của chính mình')
  }

  const target = await db.select({ role: user.role }).from(user).where(eq(user.id, userId)).limit(1)

  if (target.length > 0 && target[0].role === 'admin' && role === 'staff') {
    const admins = await db
      .select({ count: count() })
      .from(user)
      .where(and(eq(user.role, 'admin'), ne(user.status, 'deleted')))

    if (Number(admins[0]?.count || 0) <= 1) {
      throw new Error('Không thể thay đổi vai trò của admin cuối cùng')
    }
  }

  await db
    .update(user)
    .set({ role, updatedAt: new Date() })
    .where(eq(user.id, userId))

  void logActivity(admin.id, admin.name, 'change_role', userId, `Changed to ${role}`)

  revalidatePath('/admin')
  return { success: true }
}

export async function toggleCanAddOptions(userId: string, canAddOptions: boolean) {
  const admin = await requireAdmin()

  if (userId === admin.id) {
    throw new Error('Không thể thay đổi quyền của chính mình')
  }

  await db
    .update(user)
    .set({ canAddOptions, updatedAt: new Date() })
    .where(eq(user.id, userId))

  void logActivity(admin.id, admin.name, 'toggle_permission', userId, `canAddOptions: ${canAddOptions}`)

  revalidatePath('/admin')
  return { success: true }
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin()

  // Don't allow deleting self
  if (userId === admin.id) {
    throw new Error('Không thể xóa tài khoản của chính mình')
  }

  // Don't allow deleting another admin
  const target = await db.select({ role: user.role }).from(user).where(eq(user.id, userId)).limit(1)
  if (target.length > 0 && target[0].role === 'admin') {
    throw new Error('Không thể xóa tài khoản admin khác')
  }

  await db.transaction(async (tx) => {
    await tx.delete(session).where(eq(session.userId, userId))
    await tx.update(user).set({ status: 'deleted', updatedAt: new Date() }).where(eq(user.id, userId))
  })

  void logActivity(admin.id, admin.name, 'delete_user' as any, userId, 'Deleted user')

  // Note: predefinedOptions are now shared globally, don't delete them when deleting user

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteUserWithOrders(userId: string) {
  const admin = await requireAdmin()

  // Don't allow deleting self
  if (userId === admin.id) {
    throw new Error('Không thể xóa tài khoản của chính mình')
  }

  // Don't allow deleting another admin
  const target = await db.select({ role: user.role }).from(user).where(eq(user.id, userId)).limit(1)
  if (target.length > 0 && target[0].role === 'admin') {
    throw new Error('Không thể xóa tài khoản admin khác')
  }

  await db.transaction(async (tx) => {
    // Delete all customer orders by this user
    await tx.delete(customers).where(eq(customers.userId, userId))
    // Delete sessions
    await tx.delete(session).where(eq(session.userId, userId))
    // Mark user as deleted
    await tx.update(user).set({ status: 'deleted', updatedAt: new Date() }).where(eq(user.id, userId))
  })

  void logActivity(admin.id, admin.name, 'delete_user' as any, userId, 'Deleted user + all orders')

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getStaffCustomerCounts() {
  await requireAdmin()

  const result = await db
    .select({
      userId: customers.userId,
      count: count(),
    })
    .from(customers)
    .groupBy(customers.userId)

  const map: Record<string, number> = {}
  for (const row of result) {
    if (row.userId != null) {
      map[row.userId] = Number(row.count)
    }
  }
  return map
}

// Combined loader — single requireAdmin check, returns all staff data at once
export async function getAdminStaffData() {
  const admin = await requireAdmin()

  const [users, statsRows, customerCounts] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        canAddOptions: user.canAddOptions,
        permissions: user.permissions,
        avatar: user.avatar,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(ne(user.status, 'deleted'))
      .orderBy(desc(user.createdAt)),
    db
      .select({
        total: count(),
        pending: sum(sql`CASE WHEN ${user.status} = 'pending' THEN 1 ELSE 0 END`),
        approved: sum(sql`CASE WHEN ${user.status} = 'approved' THEN 1 ELSE 0 END`),
        staff: sum(sql`CASE WHEN ${user.role} = 'staff' THEN 1 ELSE 0 END`),
      })
      .from(user)
      .where(ne(user.status, 'deleted')),
    db
      .select({
        userId: customers.userId,
        total: count(),
        pending: sum(sql`CASE WHEN ${customers.status} = 'pending' THEN 1 ELSE 0 END`),
        repairing: sum(sql`CASE WHEN ${customers.status} = 'repairing' THEN 1 ELSE 0 END`),
        completed: sum(sql`CASE WHEN ${customers.status} = 'completed' THEN 1 ELSE 0 END`),
        returned: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN 1 ELSE 0 END`),
        revenue: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN ${customers.repairCost} ELSE 0 END`),
      })
      .from(customers)
      .groupBy(customers.userId),
  ])

  const statsRow = statsRows[0]
  const stats = {
    total: Number(statsRow?.total || 0),
    pending: Number(statsRow?.pending || 0),
    approved: Number(statsRow?.approved || 0),
    staff: Number(statsRow?.staff || 0),
  }

  const countsMap: Record<string, { total: number; pending: number; repairing: number; completed: number; returned: number; revenue: number }> = {}
  for (const row of customerCounts) {
    if (row.userId != null) {
      countsMap[row.userId] = {
        total: Number(row.total || 0),
        pending: Number(row.pending || 0),
        repairing: Number(row.repairing || 0),
        completed: Number(row.completed || 0),
        returned: Number(row.returned || 0),
        revenue: Number(row.revenue || 0),
      }
    }
  }

  return { users, stats, customerCounts: countsMap }
}

export async function getAllCustomers(
  search?: string,
  page: number = 1,
  limit: number = 10,
  status?: string,
  dateFrom?: string,
  dateTo?: string,
  staffId?: string
) {
  await requireAdmin()

  const conditions: any[] = []

  if (search) {
    conditions.push(
      or(
        like(customers.customerName, `%${search}%`),
        like(customers.phone, `%${search}%`),
        like(customers.ticketId, `%${search}%`)
      )!
    )
  }

  if (status) {
    conditions.push(eq(customers.status, status))
  }

  if (staffId) {
    conditions.push(eq(customers.userId, staffId))
  }

  if (dateFrom) {
    const d = new Date(`${dateFrom}T00:00:00`)
    if (!Number.isNaN(d.getTime())) {
      conditions.push(gte(customers.receivedDate, d))
    }
  }

  if (dateTo) {
    const d = new Date(`${dateTo}T23:59:59.999`)
    if (!Number.isNaN(d.getTime())) {
      conditions.push(lte(customers.receivedDate, d))
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Run count + data + stats in parallel (single requireAdmin already checked)
  const [totalResult, statsRows, data] = await Promise.all([
    db.select({ total: count() }).from(customers).where(whereClause),
    db
      .select({
        total: count(),
        pending: sum(sql`CASE WHEN ${customers.status} = 'pending' THEN 1 ELSE 0 END`),
        repairing: sum(sql`CASE WHEN ${customers.status} = 'repairing' THEN 1 ELSE 0 END`),
        completed: sum(sql`CASE WHEN ${customers.status} = 'completed' THEN 1 ELSE 0 END`),
        returned: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN 1 ELSE 0 END`),
        totalRevenue: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN ${customers.repairCost} ELSE 0 END`),
      })
      .from(customers)
      .where(whereClause),
    db
      .select({
        id: customers.id,
        ticketId: customers.ticketId,
        customerName: customers.customerName,
        phone: customers.phone,
        receivedDate: customers.receivedDate,
        returnedDate: customers.returnedDate,
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
        createdAt: customers.createdAt,
        userId: customers.userId,
        staffName: user.name,
      })
      .from(customers)
      .leftJoin(user, eq(customers.userId, user.id))
      .where(whereClause)
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
  ])

  const totalCount = Number(totalResult[0]?.total || 0)
  const totalPages = Math.max(1, Math.ceil(totalCount / limit))

  const r = statsRows[0]
  const stats = {
    totalCustomers: Number(r?.total || 0),
    pending: Number(r?.pending || 0),
    repairing: Number(r?.repairing || 0),
    completed: Number(r?.completed || 0),
    returned: Number(r?.returned || 0),
    totalRevenue: Number(r?.totalRevenue || 0),
  }

  return { data, totalPages, page, totalCount, stats }
}

export async function getAllCustomerStats() {
  await requireAdmin()

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

  const r = rows[0]
  return {
    totalCustomers: Number(r?.total || 0),
    pending: Number(r?.pending || 0),
    repairing: Number(r?.repairing || 0),
    completed: Number(r?.completed || 0),
    returned: Number(r?.returned || 0),
    totalRevenue: Number(r?.totalRevenue || 0),
  }
}

// --- Staff permissions (granular control) ---

export async function updateStaffPermissions(userId: string, permissions: StaffPermissions) {
  const admin = await requireAdmin()

  await db
    .update(user)
    .set({
      permissions: JSON.stringify(permissions),
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))

  await logActivity(admin.id, admin.name, 'toggle_permission', userId, `Cập nhật quyền: ${JSON.stringify(permissions)}`)
  revalidatePath('/admin')
}

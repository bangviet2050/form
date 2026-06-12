'use server'

import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { customers, user } from '@/lib/db/schema'
import { and, desc, eq, gte, lte, count, sum, sql, like } from 'drizzle-orm'
import ExcelJS from 'exceljs'

async function requireAdmin() {
  const result = await getSession()
  if (!result?.user || result.user.role !== 'admin') {
    throw new Error('Chỉ admin mới có thể xem báo cáo')
  }
  return result.user
}

// --- Revenue by month ---
export async function getRevenueByMonth(year?: number) {
  await requireAdmin()

  const y = year || new Date().getFullYear()
  const startDate = new Date(y, 0, 1)
  const endDate = new Date(y, 11, 31, 23, 59, 59)

  const rows = await db
    .select({
      month: sql<number>`EXTRACT(MONTH FROM ${customers.receivedDate})`,
      totalOrders: count(),
      revenue: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN ${customers.repairCost} ELSE 0 END`),
      completedOrders: sum(sql`CASE WHEN ${customers.status} IN ('completed', 'returned') THEN 1 ELSE 0 END`),
    })
    .from(customers)
    .where(and(gte(customers.receivedDate, startDate), lte(customers.receivedDate, endDate)))
    .groupBy(sql`EXTRACT(MONTH FROM ${customers.receivedDate})`)
    .orderBy(sql`EXTRACT(MONTH FROM ${customers.receivedDate})`)

  // Fill in missing months with zero
  const result = []
  for (let m = 1; m <= 12; m++) {
    const found = rows.find((r: any) => Number(r.month) === m)
    result.push({
      month: m,
      monthLabel: `Tháng ${m}`,
      totalOrders: Number(found?.totalOrders || 0),
      revenue: Number(found?.revenue || 0),
      completedOrders: Number(found?.completedOrders || 0),
    })
  }
  return result
}

// --- Revenue by week (last 12 weeks) ---
export async function getRevenueByWeek() {
  await requireAdmin()

  const now = new Date()
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({
      week: sql<number>`EXTRACT(WEEK FROM ${customers.receivedDate})`,
      year: sql<number>`EXTRACT(YEAR FROM ${customers.receivedDate})`,
      totalOrders: count(),
      revenue: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN ${customers.repairCost} ELSE 0 END`),
    })
    .from(customers)
    .where(gte(customers.receivedDate, twelveWeeksAgo))
    .groupBy(sql`EXTRACT(YEAR FROM ${customers.receivedDate})`, sql`EXTRACT(WEEK FROM ${customers.receivedDate})`)
    .orderBy(sql`EXTRACT(YEAR FROM ${customers.receivedDate})`, sql`EXTRACT(WEEK FROM ${customers.receivedDate})`)

  return rows.map((r: any) => ({
    week: Number(r.week),
    year: Number(r.year),
    label: `T${Number(r.week)}/${Number(r.year)}`,
    totalOrders: Number(r.totalOrders || 0),
    revenue: Number(r.revenue || 0),
  }))
}

// --- Device type stats ---
export async function getDeviceStats() {
  await requireAdmin()

  const rows = await db
    .select({
      deviceType: customers.deviceType,
      count: count(),
      revenue: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN ${customers.repairCost} ELSE 0 END`),
    })
    .from(customers)
    .groupBy(customers.deviceType)
    .orderBy(desc(count()))

  return rows.map((r: any) => ({
    deviceType: r.deviceType,
    count: Number(r.count),
    revenue: Number(r.revenue || 0),
  }))
}

// --- Completion rate ---
export async function getCompletionRate() {
  await requireAdmin()

  const rows = await db
    .select({
      total: count(),
      pending: sum(sql`CASE WHEN ${customers.status} = 'pending' THEN 1 ELSE 0 END`),
      repairing: sum(sql`CASE WHEN ${customers.status} = 'repairing' THEN 1 ELSE 0 END`),
      completed: sum(sql`CASE WHEN ${customers.status} = 'completed' THEN 1 ELSE 0 END`),
      returned: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN 1 ELSE 0 END`),
    })
    .from(customers)

  const r = rows[0]
  const total = Number(r?.total || 0)
  return {
    total,
    pending: Number(r?.pending || 0),
    repairing: Number(r?.repairing || 0),
    completed: Number(r?.completed || 0),
    returned: Number(r?.returned || 0),
    completionRate: total > 0 ? Math.round(((Number(r?.completed || 0) + Number(r?.returned || 0)) / total) * 100) : 0,
    returnRate: total > 0 ? Math.round((Number(r?.returned || 0) / total) * 100) : 0,
  }
}

// --- Staff performance ---
export async function getStaffPerformance() {
  await requireAdmin()

  const rows = await db
    .select({
      userId: customers.userId,
      staffName: user.name,
      staffEmail: user.email,
      totalOrders: count(),
      pending: sum(sql`CASE WHEN ${customers.status} = 'pending' THEN 1 ELSE 0 END`),
      repairing: sum(sql`CASE WHEN ${customers.status} = 'repairing' THEN 1 ELSE 0 END`),
      completed: sum(sql`CASE WHEN ${customers.status} = 'completed' THEN 1 ELSE 0 END`),
      returned: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN 1 ELSE 0 END`),
      revenue: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN ${customers.repairCost} ELSE 0 END`),
    })
    .from(customers)
    .leftJoin(user, eq(customers.userId, user.id))
    .groupBy(customers.userId, user.name, user.email)
    .orderBy(desc(count()))

  return rows.map((r: any) => ({
    userId: r.userId,
    staffName: r.staffName || r.staffEmail || 'Unknown',
    totalOrders: Number(r.totalOrders),
    pending: Number(r.pending || 0),
    repairing: Number(r.repairing || 0),
    completed: Number(r.completed || 0),
    returned: Number(r.returned || 0),
    revenue: Number(r.revenue || 0),
  }))
}

// --- Combined report data loader (single requireAdmin check) ---
export async function getReportData(year?: number) {
  await requireAdmin()

  const y = year || new Date().getFullYear()
  const startDate = new Date(y, 0, 1)
  const endDate = new Date(y, 11, 31, 23, 59, 59)

  const [revenueRows, deviceRows, completionRows, staffRows] = await Promise.all([
    // Revenue by month
    db
      .select({
        month: sql<number>`EXTRACT(MONTH FROM ${customers.receivedDate})`,
        totalOrders: count(),
        revenue: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN ${customers.repairCost} ELSE 0 END`),
        completedOrders: sum(sql`CASE WHEN ${customers.status} IN ('completed', 'returned') THEN 1 ELSE 0 END`),
      })
      .from(customers)
      .where(and(gte(customers.receivedDate, startDate), lte(customers.receivedDate, endDate)))
      .groupBy(sql`EXTRACT(MONTH FROM ${customers.receivedDate})`)
      .orderBy(sql`EXTRACT(MONTH FROM ${customers.receivedDate})`),
    // Device stats
    db
      .select({
        deviceType: customers.deviceType,
        count: count(),
        revenue: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN ${customers.repairCost} ELSE 0 END`),
      })
      .from(customers)
      .groupBy(customers.deviceType)
      .orderBy(desc(count())),
    // Completion rate
    db
      .select({
        total: count(),
        pending: sum(sql`CASE WHEN ${customers.status} = 'pending' THEN 1 ELSE 0 END`),
        repairing: sum(sql`CASE WHEN ${customers.status} = 'repairing' THEN 1 ELSE 0 END`),
        completed: sum(sql`CASE WHEN ${customers.status} = 'completed' THEN 1 ELSE 0 END`),
        returned: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN 1 ELSE 0 END`),
      })
      .from(customers),
    // Staff performance
    db
      .select({
        userId: customers.userId,
        staffName: user.name,
        staffEmail: user.email,
        totalOrders: count(),
        pending: sum(sql`CASE WHEN ${customers.status} = 'pending' THEN 1 ELSE 0 END`),
        repairing: sum(sql`CASE WHEN ${customers.status} = 'repairing' THEN 1 ELSE 0 END`),
        completed: sum(sql`CASE WHEN ${customers.status} = 'completed' THEN 1 ELSE 0 END`),
        returned: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN 1 ELSE 0 END`),
        revenue: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN ${customers.repairCost} ELSE 0 END`),
      })
      .from(customers)
      .leftJoin(user, eq(customers.userId, user.id))
      .groupBy(customers.userId, user.name, user.email)
      .orderBy(desc(count())),
  ])

  // Process revenue data — fill missing months
  const revenueData = []
  for (let m = 1; m <= 12; m++) {
    const found = revenueRows.find((r: any) => Number(r.month) === m)
    revenueData.push({
      month: m,
      monthLabel: `Tháng ${m}`,
      totalOrders: Number(found?.totalOrders || 0),
      revenue: Number(found?.revenue || 0),
      completedOrders: Number(found?.completedOrders || 0),
    })
  }

  // Process device stats
  const deviceStats = deviceRows.map((r: any) => ({
    deviceType: r.deviceType,
    count: Number(r.count),
    revenue: Number(r.revenue || 0),
  }))

  // Process completion rate
  const c = completionRows[0]
  const total = Number(c?.total || 0)
  const completionRate = {
    total,
    pending: Number(c?.pending || 0),
    repairing: Number(c?.repairing || 0),
    completed: Number(c?.completed || 0),
    returned: Number(c?.returned || 0),
    completionRate: total > 0 ? Math.round(((Number(c?.completed || 0) + Number(c?.returned || 0)) / total) * 100) : 0,
    returnRate: total > 0 ? Math.round((Number(c?.returned || 0) / total) * 100) : 0,
  }

  // Process staff performance
  const staffPerf = staffRows.map((r: any) => ({
    userId: r.userId,
    staffName: r.staffName || r.staffEmail || 'Unknown',
    totalOrders: Number(r.totalOrders),
    pending: Number(r.pending || 0),
    repairing: Number(r.repairing || 0),
    completed: Number(r.completed || 0),
    returned: Number(r.returned || 0),
    revenue: Number(r.revenue || 0),
  }))

  return { revenueData, deviceStats, completionRate, staffPerf }
}

// --- Excel Export: Orders ---
export async function exportOrdersExcel(
  status?: string,
  dateFrom?: string,
  dateTo?: string,
  staffId?: string
) {
  const admin = await requireAdmin()

  const { logActivity } = await import('@/app/actions/activity-log')
  void logActivity(admin.id, admin.name, 'export_report', 'Đơn hàng', `Status: ${status || 'all'}, From: ${dateFrom || 'all'}, To: ${dateTo || 'all'}`)

  const conditions: any[] = []
  if (status) conditions.push(eq(customers.status, status))
  if (staffId) conditions.push(eq(customers.userId, staffId))
  if (dateFrom) {
    const d = new Date(`${dateFrom}T00:00:00`)
    if (!Number.isNaN(d.getTime())) conditions.push(gte(customers.receivedDate, d))
  }
  if (dateTo) {
    const d = new Date(`${dateTo}T23:59:59.999`)
    if (!Number.isNaN(d.getTime())) conditions.push(lte(customers.receivedDate, d))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const data = await db
    .select({
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
      status: customers.status,
      returnedDate: customers.returnedDate,
      notes: customers.notes,
      staffName: user.name,
    })
    .from(customers)
    .leftJoin(user, eq(customers.userId, user.id))
    .where(whereClause)
    .orderBy(desc(customers.createdAt))

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Đơn hàng')

  sheet.columns = [
    { header: 'Mã phiếu', key: 'ticketId', width: 12 },
    { header: 'Khách hàng', key: 'customerName', width: 20 },
    { header: 'SĐT', key: 'phone', width: 14 },
    { header: 'Ngày nhận', key: 'receivedDate', width: 14 },
    { header: 'Thiết bị', key: 'deviceType', width: 16 },
    { header: 'Model', key: 'deviceModel', width: 16 },
    { header: 'Phụ kiện', key: 'accessories', width: 20 },
    { header: 'Tình trạng trước', key: 'conditionBefore', width: 20 },
    { header: 'Tình trạng sau', key: 'conditionAfter', width: 20 },
    { header: 'Người nhận', key: 'receivedBy', width: 14 },
    { header: 'Người sửa', key: 'repairedBy', width: 14 },
    { header: 'Giá sửa', key: 'repairCost', width: 14 },
    { header: 'Trạng thái', key: 'status', width: 12 },
    { header: 'Ngày trả', key: 'returnedDate', width: 14 },
    { header: 'Ghi chú', key: 'notes', width: 24 },
    { header: 'Nhân viên', key: 'staffName', width: 16 },
  ]

  // Style header
  sheet.getRow(1).font = { bold: true, size: 11 }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
  sheet.getRow(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }

  const statusMap: Record<string, string> = {
    pending: 'Chờ sửa',
    repairing: 'Đang sửa',
    completed: 'Đã xong',
    returned: 'Đã trả',
  }

  for (const row of data as any[]) {
    sheet.addRow({
      ...row,
      receivedDate: row.receivedDate ? new Date(row.receivedDate).toLocaleDateString('vi-VN') : '',
      returnedDate: row.returnedDate ? new Date(row.returnedDate).toLocaleDateString('vi-VN') : '',
      repairCost: row.repairCost ? Number(row.repairCost) : 0,
      status: statusMap[row.status] || row.status,
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer).toString('base64')
}

// --- Excel Export: Revenue ---
export async function exportRevenueExcel(year?: number) {
  const admin = await requireAdmin()

  const { logActivity } = await import('@/app/actions/activity-log')
  void logActivity(admin.id, admin.name, 'export_report', 'Doanh thu', `Year: ${year || new Date().getFullYear()}`)

  const revenueData = await getRevenueByMonth(year)

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Doanh thu theo tháng')

  sheet.columns = [
    { header: 'Tháng', key: 'monthLabel', width: 14 },
    { header: 'Số đơn', key: 'totalOrders', width: 12 },
    { header: 'Đơn hoàn thành', key: 'completedOrders', width: 16 },
    { header: 'Doanh thu (đ)', key: 'revenue', width: 18 },
  ]

  sheet.getRow(1).font = { bold: true, size: 11 }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
  sheet.getRow(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }

  for (const row of revenueData) {
    sheet.addRow({
      monthLabel: row.monthLabel,
      totalOrders: row.totalOrders,
      completedOrders: row.completedOrders,
      revenue: row.revenue,
    })
  }

  // Total row
  const totalRow = sheet.addRow({
    monthLabel: 'TỔNG',
    totalOrders: revenueData.reduce((s, r) => s + r.totalOrders, 0),
    completedOrders: revenueData.reduce((s, r) => s + r.completedOrders, 0),
    revenue: revenueData.reduce((s, r) => s + r.revenue, 0),
  })
  totalRow.font = { bold: true }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer).toString('base64')
}

// --- Excel Export: Staff Performance ---
export async function exportStaffPerformanceExcel() {
  const admin = await requireAdmin()

  const { logActivity } = await import('@/app/actions/activity-log')
  void logActivity(admin.id, admin.name, 'export_report', 'Hiệu suất nhân viên')

  const staffData = await getStaffPerformance()

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Hiệu suất nhân viên')

  sheet.columns = [
    { header: 'Nhân viên', key: 'staffName', width: 20 },
    { header: 'Tổng đơn', key: 'totalOrders', width: 12 },
    { header: 'Chờ sửa', key: 'pending', width: 12 },
    { header: 'Đang sửa', key: 'repairing', width: 12 },
    { header: 'Đã xong', key: 'completed', width: 12 },
    { header: 'Đã trả', key: 'returned', width: 12 },
    { header: 'Doanh thu (đ)', key: 'revenue', width: 18 },
  ]

  sheet.getRow(1).font = { bold: true, size: 11 }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
  sheet.getRow(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' }

  for (const row of staffData) {
    sheet.addRow(row)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer).toString('base64')
}

'use server'

import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { customers, user } from '@/lib/db/schema'
import { and, desc, eq, gte, lte, count, sum, sql, like, or } from 'drizzle-orm'
import ExcelJS from 'exceljs'

async function requireAdmin() {
  const result = await getSession()
  if (!result?.user || result.user.role !== 'admin') {
    throw new Error('Chỉ admin mới có thể xem báo cáo')
  }
  return result.user
}

async function requireAdminOrReportsPerm() {
  const result = await getSession()
  if (!result?.user) {
    throw new Error('Unauthorized')
  }
  if (result.user.role === 'admin') return { user: result.user, isStaff: false }
  // Check if staff has reports tab permission
  try {
    const perms = result.user.permissions ? JSON.parse(result.user.permissions) : {}
    if (perms?.tabs?.reports) return { user: result.user, isStaff: true }
  } catch {}
  throw new Error('Chỉ admin mới có thể xem báo cáo')
}

function sanitizeExcel(str: string | null | undefined) {
  const value = str ?? ''
  return /^[=+\-@]/.test(value) ? `'${value}` : value
}

// --- Revenue by month ---
export async function getRevenueByMonth(year?: number) {
  const { user: caller, isStaff } = await requireAdminOrReportsPerm()

  const y = year || new Date().getFullYear()
  const startDate = new Date(y, 0, 1)
  const endDate = new Date(y, 11, 31, 23, 59, 59)

  const baseConditions = [gte(customers.receivedDate, startDate), lte(customers.receivedDate, endDate)]
  if (isStaff) baseConditions.push(eq(customers.userId, caller.id))

  const rows = await db
    .select({
      month: sql<number>`EXTRACT(MONTH FROM ${customers.receivedDate})`,
      totalOrders: count(),
      revenue: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN ${customers.repairCost} ELSE 0 END`),
      completedOrders: sum(sql`CASE WHEN ${customers.status} IN ('completed', 'returned') THEN 1 ELSE 0 END`),
    })
    .from(customers)
    .where(and(...baseConditions))
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
  const { user: caller, isStaff } = await requireAdminOrReportsPerm()

  const now = new Date()
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000)

  const conditions: any[] = [gte(customers.receivedDate, twelveWeeksAgo)]
  if (isStaff) conditions.push(eq(customers.userId, caller.id))

  const rows = await db
    .select({
      week: sql<number>`EXTRACT(WEEK FROM ${customers.receivedDate})`,
      year: sql<number>`EXTRACT(YEAR FROM ${customers.receivedDate})`,
      totalOrders: count(),
      revenue: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN ${customers.repairCost} ELSE 0 END`),
    })
    .from(customers)
    .where(conditions.length > 1 ? and(...conditions) : conditions[0])
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
  const { user: caller, isStaff } = await requireAdminOrReportsPerm()

  const rows = await db
    .select({
      deviceType: customers.deviceType,
      count: count(),
      revenue: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN ${customers.repairCost} ELSE 0 END`),
    })
    .from(customers)
    .where(isStaff ? eq(customers.userId, caller.id) : undefined)
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
  const { user: caller, isStaff } = await requireAdminOrReportsPerm()

  const rows = await db
    .select({
      total: count(),
      pending: sum(sql`CASE WHEN ${customers.status} = 'pending' THEN 1 ELSE 0 END`),
      repairing: sum(sql`CASE WHEN ${customers.status} = 'repairing' THEN 1 ELSE 0 END`),
      completed: sum(sql`CASE WHEN ${customers.status} = 'completed' THEN 1 ELSE 0 END`),
      returned: sum(sql`CASE WHEN ${customers.status} = 'returned' THEN 1 ELSE 0 END`),
    })
    .from(customers)
    .where(isStaff ? eq(customers.userId, caller.id) : undefined)

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
  const { user: caller, isStaff } = await requireAdminOrReportsPerm()

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
    .where(isStaff ? eq(customers.userId, caller.id) : undefined)
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
export async function getReportData(year?: number, staffName?: string) {
  const { user: caller, isStaff } = await requireAdminOrReportsPerm()

  const y = year || new Date().getFullYear()
  const startDate = new Date(y, 0, 1)
  const endDate = new Date(y, 11, 31, 23, 59, 59)

  // Determine userId filter: staff always sees own data; admin can filter by staff name
  let staffUserId: string | undefined
  if (isStaff) {
    staffUserId = caller.id
  } else if (staffName) {
    if (staffName === '__mine__') {
      staffUserId = caller.id
    } else {
      const [staffUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.name, staffName), eq(user.status, 'approved')))
        .limit(1)
      staffUserId = staffUser?.id
    }
  }
  const staffFilter = staffUserId ? eq(customers.userId, staffUserId) : undefined

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
      .where(staffFilter ? and(staffFilter, gte(customers.receivedDate, startDate), lte(customers.receivedDate, endDate)) : and(gte(customers.receivedDate, startDate), lte(customers.receivedDate, endDate)))
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
      .where(staffFilter)
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
      .from(customers)
      .where(staffFilter),
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
      .where(staffFilter)
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
  staffId?: string,
  search?: string,
  staffName?: string
) {
  const { user: caller, isStaff } = await requireAdminOrReportsPerm()

  const { logActivity } = await import('@/app/actions/activity-log')
  void logActivity(caller.id, caller.name, 'export_report', 'Đơn hàng', `Status: ${status || 'all'}, From: ${dateFrom || 'all'}, To: ${dateTo || 'all'}, Search: ${search || 'all'}, Staff: ${staffName || staffId || 'all'}`)

  const conditions: any[] = []
  if (isStaff) conditions.push(eq(customers.userId, caller.id))
  if (status) conditions.push(eq(customers.status, status))
  if (staffId) conditions.push(eq(customers.userId, staffId))
  if (search) {
    conditions.push(
      or(
        like(customers.customerName, `%${search}%`),
        like(customers.phone, `%${search}%`),
        like(customers.ticketId, `%${search}%`)
      )!
    )
  }
  if (staffName) {
    conditions.push(
      or(
        eq(customers.receivedBy, staffName),
        eq(customers.repairedBy, staffName),
        eq(user.name, staffName)
      )!
    )
  }
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

  const statusMap: Record<string, string> = {
    pending: 'Chờ sửa',
    repairing: 'Đang sửa',
    completed: 'Đã xong',
    returned: 'Đã trả',
  }

  // Column definitions (no header - we add it manually)
  sheet.columns = [
    { key: 'stt', width: 6 },
    { key: 'ticketId', width: 12 },
    { key: 'customerName', width: 20 },
    { key: 'phone', width: 14 },
    { key: 'receivedDate', width: 14 },
    { key: 'deviceType', width: 14 },
    { key: 'deviceModel', width: 16 },
    { key: 'accessories', width: 18 },
    { key: 'conditionBefore', width: 18 },
    { key: 'conditionAfter', width: 18 },
    { key: 'receivedBy', width: 14 },
    { key: 'repairedBy', width: 14 },
    { key: 'repairCost', width: 16 },
    { key: 'status', width: 12 },
    { key: 'returnedDate', width: 14 },
    { key: 'notes', width: 24 },
  ]

  // Title row (row 1)
  const titleRow = sheet.addRow([sanitizeExcel('DANH SÁCH ĐƠN HÀNG')])
  titleRow.font = { bold: true, size: 16, color: { argb: 'FF1F4E79' } }
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.mergeCells('A1:P1')
  titleRow.height = 32

  // Subtitle row (row 2)
  const subtitleRow = sheet.addRow([
    sanitizeExcel(`Xuất lúc: ${new Date().toLocaleString('vi-VN')}${status ? ` | Trạng thái: ${statusMap[status] || status}` : ''}${dateFrom ? ` | Từ: ${dateFrom}` : ''}${dateTo ? ` | Đến: ${dateTo}` : ''}`)
  ])
  subtitleRow.font = { italic: true, size: 10, color: { argb: 'FF666666' } }
  subtitleRow.alignment = { horizontal: 'center' }
  sheet.mergeCells('A2:P2')

  // Blank row (row 3)
  sheet.addRow([])

  // Header row (row 4)
  const headerRow = sheet.addRow([
    sanitizeExcel('STT'), sanitizeExcel('Mã phiếu'), sanitizeExcel('Khách hàng'), sanitizeExcel('SĐT'), sanitizeExcel('Ngày nhận'),
    sanitizeExcel('Thiết bị'), sanitizeExcel('Model'), sanitizeExcel('Phụ kiện'), sanitizeExcel('Trước khi sửa'), sanitizeExcel('Sau khi sửa'),
    sanitizeExcel('Người nhận'), sanitizeExcel('Người sửa'), sanitizeExcel('Giá sửa (đ)'), sanitizeExcel('Trạng thái'), sanitizeExcel('Ngày trả'), sanitizeExcel('Ghi chú')
  ])
  headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  headerRow.border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  }
  headerRow.height = 24

  const statusColors: Record<string, string> = {
    'Chờ sửa': 'FFFFF3CD',
    'Đang sửa': 'FFE2D9F3',
    'Đã xong': 'FFD4EDDA',
    'Đã trả': 'FFD1ECF8',
  }

  let rowIndex = 0
  for (const row of data as any[]) {
    rowIndex++
    const newRow = sheet.addRow([
      rowIndex,
      sanitizeExcel(row.ticketId),
      sanitizeExcel(row.customerName),
      sanitizeExcel(row.phone),
      row.receivedDate ? sanitizeExcel(new Date(row.receivedDate).toLocaleDateString('vi-VN')) : '',
      sanitizeExcel(row.deviceType),
      sanitizeExcel(row.deviceModel || ''),
      sanitizeExcel(row.accessories || ''),
      sanitizeExcel(row.conditionBefore || ''),
      sanitizeExcel(row.conditionAfter || ''),
      sanitizeExcel(row.receivedBy || ''),
      sanitizeExcel(row.repairedBy || ''),
      row.repairCost ? Number(row.repairCost) : 0,
      sanitizeExcel(statusMap[row.status] || row.status),
      row.returnedDate ? sanitizeExcel(new Date(row.returnedDate).toLocaleDateString('vi-VN')) : '',
      sanitizeExcel(row.notes || ''),
    ])

    // Alternating row colors
    const bgColor = rowIndex % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF'
    newRow.eachCell((cell: any) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      }
      cell.alignment = { vertical: 'middle', wrapText: true }
    })

    // Status cell color
    const statusLabel = sanitizeExcel(statusMap[row.status] || row.status)
    const statusColor = statusColors[statusLabel]
    if (statusColor) {
      const statusCell = newRow.getCell(14) // column N = Trạng thái
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } }
      statusCell.font = { bold: true }
      statusCell.alignment = { horizontal: 'center', vertical: 'middle' }
    }

    // Cost cell format (column M = 13)
    const costCell = newRow.getCell(13)
    costCell.numFmt = '#,##0'
    costCell.alignment = { horizontal: 'right', vertical: 'middle' }

    // STT center (column A)
    newRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    // Ticket center (column B)
    newRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }
    // Date center (columns E, O)
    newRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' }
    newRow.getCell(15).alignment = { horizontal: 'center', vertical: 'middle' }
  }

  // Total row
  const totalRow = sheet.addRow([
    '', '', '', '', '', '', '', '', '', '', '', '',
    { formula: `SUM(M5:M${sheet.rowCount - 1})`, result: undefined as any },
    sanitizeExcel(`${rowIndex} đơn`), '', '',
  ])
  totalRow.font = { bold: true, size: 11, color: { argb: 'FF1F4E79' } }
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF4' } }
  totalRow.eachCell((cell: any) => {
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF1F4E79' } },
      bottom: { style: 'medium', color: { argb: 'FF1F4E79' } },
      left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    }
  })
  const totalCostCell = totalRow.getCell(13)
  totalCostCell.numFmt = '#,##0'
  totalCostCell.alignment = { horizontal: 'right', vertical: 'middle' }

  // Freeze header
  sheet.views = [{ state: 'frozen', ySplit: 4, xSplit: 0 }]

  // Auto-filter
  sheet.autoFilter = { from: 'A4', to: 'P4' }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer).toString('base64')
}

// --- Excel Export: Revenue ---
export async function exportRevenueExcel(year?: number) {
  const { user: caller, isStaff } = await requireAdminOrReportsPerm()

  const { logActivity } = await import('@/app/actions/activity-log')
  void logActivity(caller.id, caller.name, 'export_report', 'Doanh thu', `Year: ${year || new Date().getFullYear()}`)

  const revenueData = await getRevenueByMonth(year)

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Doanh thu theo tháng')

  // Column definitions (no header - we add it manually)
  sheet.columns = [
    { key: 'monthLabel', width: 16 },
    { key: 'totalOrders', width: 14 },
    { key: 'completedOrders', width: 18 },
    { key: 'revenue', width: 20 },
  ]

  // Title row (row 1)
  const titleRow = sheet.addRow([sanitizeExcel(`BÁO CÁO DOANH THU NĂM ${year || new Date().getFullYear()}`)])
  titleRow.font = { bold: true, size: 16, color: { argb: 'FF1F4E79' } }
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.mergeCells('A1:D1')
  titleRow.height = 32

  // Subtitle row (row 2)
  const subtitleRow = sheet.addRow([sanitizeExcel(`Xuất lúc: ${new Date().toLocaleString('vi-VN')}`)])
  subtitleRow.font = { italic: true, size: 10, color: { argb: 'FF666666' } }
  subtitleRow.alignment = { horizontal: 'center' }
  sheet.mergeCells('A2:D2')

  // Blank row (row 3)
  sheet.addRow([])

  // Header row (row 4)
  const headerRow = sheet.addRow([sanitizeExcel('Tháng'), sanitizeExcel('Số đơn'), sanitizeExcel('Đơn hoàn thành'), sanitizeExcel('Doanh thu (đ)')])
  headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  headerRow.border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  }
  headerRow.height = 24

  let rowIndex = 0
  for (const row of revenueData) {
    rowIndex++
    const newRow = sheet.addRow([
      sanitizeExcel(row.monthLabel),
      row.totalOrders,
      row.completedOrders,
      row.revenue,
    ])

    // Alternating row colors
    const bgColor = rowIndex % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF'
    newRow.eachCell((cell: any) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      }
      cell.alignment = { vertical: 'middle' }
    })

    // Center month label
    newRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    newRow.getCell(1).font = { bold: true }

    // Number format
    newRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }
    newRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' }
    newRow.getCell(4).numFmt = '#,##0'
    newRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }

    // Highlight months with revenue
    if (row.revenue > 0) {
      newRow.getCell(4).font = { bold: true, color: { argb: 'FF1B7A3D' } }
    }
  }

  // Total row
  const totalRow = sheet.addRow([
    sanitizeExcel('TỔNG CỘNG'),
    revenueData.reduce((s: number, r: any) => s + r.totalOrders, 0),
    revenueData.reduce((s: number, r: any) => s + r.completedOrders, 0),
    revenueData.reduce((s: number, r: any) => s + r.revenue, 0),
  ])
  totalRow.font = { bold: true, size: 11, color: { argb: 'FF1F4E79' } }
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF4' } }
  totalRow.eachCell((cell: any) => {
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF1F4E79' } },
      bottom: { style: 'medium', color: { argb: 'FF1F4E79' } },
      left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    }
  })
  totalRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
  totalRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }
  totalRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' }
  totalRow.getCell(4).numFmt = '#,##0'
  totalRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }
  totalRow.getCell(4).font = { bold: true, size: 12, color: { argb: 'FF1F4E79' } }

  // Freeze header
  sheet.views = [{ state: 'frozen', ySplit: 4, xSplit: 0 }]

  // Auto-filter
  sheet.autoFilter = { from: 'A4', to: 'D4' }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer).toString('base64')
}

// --- Excel Export: Staff Performance ---
export async function exportStaffPerformanceExcel() {
  const { user: caller, isStaff } = await requireAdminOrReportsPerm()

  const { logActivity } = await import('@/app/actions/activity-log')
  void logActivity(caller.id, caller.name, 'export_report', 'Hiệu suất nhân viên')

  const staffData = await getStaffPerformance()

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Hiệu suất nhân viên')

  // Column definitions (no header - we add it manually)
  sheet.columns = [
    { key: 'stt', width: 6 },
    { key: 'staffName', width: 22 },
    { key: 'totalOrders', width: 12 },
    { key: 'pending', width: 12 },
    { key: 'repairing', width: 12 },
    { key: 'completed', width: 12 },
    { key: 'returned', width: 12 },
    { key: 'revenue', width: 20 },
  ]

  // Title row (row 1)
  const titleRow = sheet.addRow([sanitizeExcel('BÁO CÁO HIỆU SUẤT NHÂN VIÊN')])
  titleRow.font = { bold: true, size: 16, color: { argb: 'FF1F4E79' } }
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.mergeCells('A1:H1')
  titleRow.height = 32

  // Subtitle row (row 2)
  const subtitleRow = sheet.addRow([sanitizeExcel(`Xuất lúc: ${new Date().toLocaleString('vi-VN')}`)])
  subtitleRow.font = { italic: true, size: 10, color: { argb: 'FF666666' } }
  subtitleRow.alignment = { horizontal: 'center' }
  sheet.mergeCells('A2:H2')

  // Blank row (row 3)
  sheet.addRow([])

  // Header row (row 4)
  const headerRow = sheet.addRow([
    sanitizeExcel('STT'), sanitizeExcel('Nhân viên'), sanitizeExcel('Tổng đơn'), sanitizeExcel('Chờ sửa'), sanitizeExcel('Đang sửa'), sanitizeExcel('Đã xong'), sanitizeExcel('Đã trả'), sanitizeExcel('Doanh thu (đ)')
  ])
  headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  headerRow.border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  }
  headerRow.height = 24

  // Status column colors
  const statusColColors: Record<string, string> = {
    pending: 'FFFFF3CD',
    repairing: 'FFE2D9F3',
    completed: 'FFD4EDDA',
    returned: 'FFD1ECF8',
  }

  let rowIndex = 0
  for (const row of staffData) {
    rowIndex++
    const newRow = sheet.addRow([
      rowIndex,
      sanitizeExcel((row as any).staffName),
      (row as any).totalOrders,
      (row as any).pending,
      (row as any).repairing,
      (row as any).completed,
      (row as any).returned,
      (row as any).revenue,
    ])

    // Alternating row colors
    const bgColor = rowIndex % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF'
    newRow.eachCell((cell: any) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      }
      cell.alignment = { vertical: 'middle' }
    })

    // STT center (col 1)
    newRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    // Staff name bold (col 2)
    newRow.getCell(2).font = { bold: true }
    // Total orders center (col 3)
    newRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' }
    newRow.getCell(3).font = { bold: true }

    // Status columns with color (cols 4-7)
    const statusKeys = ['pending', 'repairing', 'completed', 'returned']
    for (let i = 0; i < statusKeys.length; i++) {
      const colNum = 4 + i
      const cell = newRow.getCell(colNum)
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      const val = cell.value as number
      if (val > 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColColors[statusKeys[i]] } }
        cell.font = { bold: true }
      }
    }

    // Revenue format (col 8)
    newRow.getCell(8).numFmt = '#,##0'
    newRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' }
    if ((row as any).revenue > 0) {
      newRow.getCell(8).font = { bold: true, color: { argb: 'FF1B7A3D' } }
    }
  }

  // Total row
  const totalRow = sheet.addRow([
    '',
    sanitizeExcel('TỔNG CỘNG'),
    staffData.reduce((s: number, r: any) => s + r.totalOrders, 0),
    staffData.reduce((s: number, r: any) => s + r.pending, 0),
    staffData.reduce((s: number, r: any) => s + r.repairing, 0),
    staffData.reduce((s: number, r: any) => s + r.completed, 0),
    staffData.reduce((s: number, r: any) => s + r.returned, 0),
    staffData.reduce((s: number, r: any) => s + r.revenue, 0),
  ])
  totalRow.font = { bold: true, size: 11, color: { argb: 'FF1F4E79' } }
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF4' } }
  totalRow.eachCell((cell: any) => {
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF1F4E79' } },
      bottom: { style: 'medium', color: { argb: 'FF1F4E79' } },
      left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    }
  })
  totalRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }
  totalRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' }
  totalRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' }
  totalRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' }
  totalRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' }
  totalRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' }
  totalRow.getCell(8).numFmt = '#,##0'
  totalRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' }
  totalRow.getCell(8).font = { bold: true, size: 12, color: { argb: 'FF1F4E79' } }

  // Freeze header
  sheet.views = [{ state: 'frozen', ySplit: 4, xSplit: 0 }]

  // Auto-filter
  sheet.autoFilter = { from: 'A4', to: 'H4' }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer).toString('base64')
}

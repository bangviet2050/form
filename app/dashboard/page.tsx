'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ExcelJS from 'exceljs'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CustomerForm } from '@/components/customer-form'
import { CustomerTable } from '@/components/customer-table'
import { SearchFilter } from '@/components/search-filter'
import { PrintInvoice } from '@/components/print-invoice'
import { Sheet } from '@/components/ui/sheet'
import { formatVietnamDateTime } from '@/lib/utils'
import { getCustomers, getCustomerStats } from '@/app/actions/customers'
import { getCurrentUser, signOut } from '@/app/actions/auth'
import type { Customer } from '@/lib/types'
import {
  Plus,
  LogOut,
  Settings,
  Clock,
  Wrench,
  CheckCircle2,
  RotateCcw,
  DollarSign,
  Users,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react'

type StatusHistoryEntry = {
  status: string
  date: string
  by: string
}

const statusLabels: Record<string, string> = {
  pending: 'Chờ sửa',
  repairing: 'Đang sửa',
  completed: 'Đã xong',
  returned: 'Đã trả máy',
}

function getStatusLabel(status: string) {
  return statusLabels[status] || status
}

function parseStatusHistory(statusHistory?: string | null): StatusHistoryEntry[] {
  if (!statusHistory) return []
  try {
    const parsed = JSON.parse(statusHistory)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (entry): entry is StatusHistoryEntry =>
          entry &&
          typeof entry === 'object' &&
          typeof entry.status === 'string' &&
          typeof entry.date === 'string' &&
          typeof entry.by === 'string'
      )
      .map((entry) => ({ status: entry.status, date: entry.date, by: entry.by }))
  } catch {
    return []
  }
}

function formatTimelineDate(dateString: string) {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function DashboardPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalRevenue: 0,
    pending: 0,
    repairing: 0,
    completed: 0,
    returned: 0,
  })
  const [formOpen, setFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [printingCustomer, setPrintingCustomer] = useState<Customer | null>(null)
  const [printOpen, setPrintOpen] = useState(false)
  const [statusHistoryCustomer, setStatusHistoryCustomer] = useState<Customer | null>(null)
  const [user, setUser] = useState<{ name: string; email: string; role: string; status: string; avatar?: string | null } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [hideRevenue, setHideRevenue] = useState(false)
  const [viewAll, setViewAll] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = async (
    page: number = currentPage,
    status: string = statusFilter,
    fromDate: string = dateFrom,
    toDate: string = dateTo,
    showAll: boolean = viewAll
  ) => {
    try {
      setLoading(true)
      const [result, statsData] = await Promise.all([
        getCustomers(
          undefined,
          'recent',
          page,
          13,
          status || undefined,
          fromDate || undefined,
          toDate || undefined,
          showAll || undefined
        ),
        getCustomerStats(showAll || undefined),
      ])
      setCustomers(result.data)
      // Re-apply search filter
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase()
        const filtered = result.data.filter(
          (c) =>
            c.customerName.toLowerCase().includes(lowerQuery) ||
            c.phone.includes(searchQuery) ||
            c.ticketId.includes(searchQuery)
        )
        setFilteredCustomers(filtered)
      } else {
        setFilteredCustomers(result.data)
      }
      setTotalPages(result.totalPages)
      setCurrentPage(result.page)
      setStats(statsData)
      setLastUpdated(new Date())
    } catch (error: unknown) {
      console.error('Error loading data:', error instanceof Error ? error.message : 'Unknown error')
      toast.error('Lỗi tải dữ liệu. Vui lòng thử lại.')
      setCustomers([])
      setFilteredCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const refreshStats = async () => {
    try {
      const statsData = await getCustomerStats(viewAll || undefined)
      setStats(statsData)
    } catch {
      // silent — stats will refresh on next full load
    }
  }

  // Silent refresh for dashboard (no loading spinner)
  const silentRefresh = async () => {
    try {
      const [result, statsData] = await Promise.all([
        getCustomers(
          undefined,
          'recent',
          currentPage,
          13,
          statusFilter || undefined,
          dateFrom || undefined,
          dateTo || undefined,
          viewAll || undefined
        ),
        getCustomerStats(viewAll || undefined),
      ])
      setCustomers(result.data)
      // Re-apply search filter to new data
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase()
        const filtered = result.data.filter(
          (c) =>
            c.customerName.toLowerCase().includes(lowerQuery) ||
            c.phone.includes(searchQuery) ||
            c.ticketId.includes(searchQuery)
        )
        setFilteredCustomers(filtered)
      } else {
        setFilteredCustomers(result.data)
      }
      setTotalPages(result.totalPages)
      setStats(statsData)
      setLastUpdated(new Date())
    } catch {
      // silent — keep existing data
    }
  }

  // Auto-refresh every 8s when admin is viewing all orders
  useEffect(() => {
    if (user?.role !== 'admin' || !viewAll) return
    const interval = setInterval(silentRefresh, 8000)
    return () => clearInterval(interval)
  }, [viewAll, user?.role, currentPage, statusFilter, dateFrom, dateTo, searchQuery])

  // Refresh when window regains focus (admin viewAll mode)
  useEffect(() => {
    if (user?.role !== 'admin' || !viewAll) return
    const onFocus = () => silentRefresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [viewAll, user?.role, currentPage, statusFilter, dateFrom, dateTo, searchQuery])

  useEffect(() => {
    Promise.all([
      getCurrentUser().then((u) => {
        if (!u) { setUser(null); router.push('/sign-in'); return }
        const userData = u as any
        // Check if user is pending or rejected or deleted
        if (userData.status === 'pending') {
          router.push('/pending')
          return
        }
        if (userData.status === 'rejected') {
          signOut().then(() => {
            router.push('/sign-in?error=' + encodeURIComponent('Tài khoản đã bị từ chối.'))
          })
          return
        }
        if (userData.status === 'deleted') {
          signOut().then(() => {
            router.push('/sign-in?error=' + encodeURIComponent('Tài khoản đã bị xóa.'))
          })
          return
        }
        setUser({ name: userData.name || '', email: userData.email, role: userData.role, status: userData.status, avatar: userData.avatar })
      }),
      loadData(1, ''),
    ])
  }, [])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (!query) {
      setFilteredCustomers(customers)
      return
    }
    const lowerQuery = query.toLowerCase()
    const filtered = customers.filter(
      (c) =>
        c.customerName.toLowerCase().includes(lowerQuery) ||
        c.phone.includes(query) ||
        c.ticketId.includes(query)
    )
    setFilteredCustomers(filtered)
  }

  const handleExport = async () => {
    const exportResult = await getCustomers(
      undefined,
      'recent',
      1,
      undefined,
      statusFilter || undefined,
      dateFrom || undefined,
      dateTo || undefined,
      viewAll || undefined
    )

    const exportCustomers = exportResult.data

    if (exportCustomers.length === 0) {
      toast.warning('Không có dữ liệu để xuất')
      return
    }

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Khách hàng')

    const now = new Date()
    const dateStr = now.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    const timeStr = now.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false })

    const fontTitle: Partial<ExcelJS.Font> = { name: 'Times New Roman', size: 16, bold: true, color: { argb: 'FF1F4E79' } }
    const fontInfo: Partial<ExcelJS.Font> = { name: 'Times New Roman', size: 11, italic: true, color: { argb: 'FF666666' } }
    const fontHeader: Partial<ExcelJS.Font> = { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FFFFFFFF' } }
    const fontData: Partial<ExcelJS.Font> = { name: 'Times New Roman', size: 13 }
    const fontTotal: Partial<ExcelJS.Font> = { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FF1F4E79' } }

    const fillHeader: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
    const fillEven: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF5FB' } }
    const fillOdd: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
    const fillTotal: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } }

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    }
    const headerBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    }
    const totalBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'medium', color: { argb: 'FF1F4E79' } },
      bottom: { style: 'medium', color: { argb: 'FF1F4E79' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    }

    const alignCenter: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle', wrapText: true }
    const alignLeft: Partial<ExcelJS.Alignment> = { horizontal: 'left', vertical: 'middle', wrapText: true }
    const alignRight: Partial<ExcelJS.Alignment> = { horizontal: 'right', vertical: 'middle', wrapText: true }

    // Helper: calculate display width of a string (Vietnamese chars wider)
    const charWidth = (ch: string) => ch.charCodeAt(0) > 127 ? 1.8 : 1
    const textWidth = (text: string) => [...text].reduce((sum, ch) => sum + charWidth(ch), 0)

    // Collect all data values first for auto-fit calculation
    const headers = [
      'STT', 'Mã phiếu', 'Tên khách hàng', 'SĐT', 'Ngày nhận',
      'Người nhận', 'Hiệu máy', 'Model', 'Phụ kiện', 'Tình trạng trước',
      'Tình trạng sau', 'Giá sửa (VNĐ)', 'Người sửa', 'Trạng thái', 'Ngày trả', 'Ghi chú',
    ]

    const dataRows = exportCustomers.map((c, idx) => [
      String(idx + 1),
      c.ticketId,
      c.customerName,
      c.phone,
      new Date(c.receivedDate).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) + ' ' + new Date(c.receivedDate).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }),
      c.receivedBy || '',
      c.deviceType,
      c.deviceModel || '',
      c.accessories || '',
      c.conditionBefore || '',
      c.conditionAfter || '',
      c.repairCost ? Number(c.repairCost).toLocaleString('vi-VN') : '',
      c.repairedBy || '',
      c.status === 'pending' ? 'Chờ sửa' : c.status === 'repairing' ? 'Đang sửa' : c.status === 'completed' ? 'Xong' : c.status === 'returned' ? 'Đã trả máy' : c.status,
      c.returnedDate ? new Date(c.returnedDate).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) + ' ' + new Date(c.returnedDate).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }) : '',
      c.notes || '',
    ])

    // AutoFit Column Width: max of header width and data width, with padding
    const MIN_COL_WIDTH = 8
    const MAX_COL_WIDTH = 50
    const COL_PADDING = 3
    const colWidths = headers.map((header, colIdx) => {
      const headerW = textWidth(header) + COL_PADDING
      let maxDataW = 0
      dataRows.forEach((row) => {
        const cellText = row[colIdx] || ''
        // For multi-line, take the longest line
        const lines = cellText.split('\n')
        const longestLine = Math.max(...lines.map((l: string) => textWidth(l)))
        maxDataW = Math.max(maxDataW, longestLine)
      })
      return Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, Math.max(headerW, maxDataW + COL_PADDING)))
    })

    ws.columns = colWidths.map((w) => ({ width: w }))

    const titleRow = ws.addRow(['DANH SÁCH KHÁCH HÀNG SỬA CHỮA THIẾT BỊ ĐIỆN TỬ'])
    titleRow.height = 35
    titleRow.getCell(1).font = fontTitle
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.mergeCells('A1:P1')

    const infoRow = ws.addRow([`Xuất lúc: ${dateStr} ${timeStr}  |  Tổng số: ${exportCustomers.length} khách`])
    infoRow.height = 22
    infoRow.getCell(1).font = fontInfo
    infoRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.mergeCells('A2:P2')

    ws.addRow([''])

    const headerRow = ws.addRow(headers)
    headerRow.height = 28
    for (let i = 1; i <= 16; i++) {
      const cell = headerRow.getCell(i)
      cell.font = fontHeader
      cell.fill = fillHeader
      cell.border = headerBorder
      cell.alignment = alignCenter
    }

    // Helper: calculate row height based on wrapped text
    const ROW_HEIGHT_PER_LINE = 18
    const MIN_ROW_HEIGHT = 22
    const calcRowHeight = (values: string[]) => {
      let maxLines = 1
      values.forEach((text, colIdx) => {
        if (!text) return
        const colW = colWidths[colIdx] || 10
        const lines = text.split('\n')
        lines.forEach((line: string) => {
          const w = textWidth(line)
          const wrappedLines = Math.max(1, Math.ceil(w / (colW - 1)))
          maxLines = Math.max(maxLines, wrappedLines + lines.length - 1)
        })
      })
      return Math.max(MIN_ROW_HEIGHT, maxLines * ROW_HEIGHT_PER_LINE)
    }

    exportCustomers.forEach((c, idx) => {
      const isEven = idx % 2 === 0
      const row = ws.addRow([
        idx + 1,
        c.ticketId,
        c.customerName,
        c.phone,
        new Date(c.receivedDate).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) + ' ' + new Date(c.receivedDate).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }),
        c.receivedBy || '',
        c.deviceType,
        c.deviceModel || '',
        c.accessories || '',
        c.conditionBefore || '',
        c.conditionAfter || '',
        c.repairCost ? Number(c.repairCost) : '',
        c.repairedBy || '',
        c.status === 'pending' ? 'Chờ sửa' : c.status === 'repairing' ? 'Đang sửa' : c.status === 'completed' ? 'Xong' : c.status === 'returned' ? 'Đã trả máy' : c.status,
        c.returnedDate ? new Date(c.returnedDate).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) + ' ' + new Date(c.returnedDate).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }) : '',
        c.notes || '',
      ])

      // AutoFit Row Height
      const cellValues = dataRows[idx]
      row.height = calcRowHeight(cellValues)

      for (let i = 1; i <= 16; i++) {
        const cell = row.getCell(i)
        cell.font = fontData
        cell.fill = isEven ? fillEven : fillOdd
        cell.border = thinBorder
        if (i === 1) cell.alignment = alignCenter
        else if (i === 12) cell.alignment = alignRight
        else cell.alignment = alignLeft
      }

      if (c.repairCost) row.getCell(12).numFmt = '#,##0'

      const statusCell = row.getCell(14)
      if (c.status === 'pending') statusCell.font = { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FFB8860B' } }
      else if (c.status === 'repairing') statusCell.font = { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FF1F4E79' } }
      else if (c.status === 'completed') statusCell.font = { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FF2E7D32' } }
      else if (c.status === 'returned') statusCell.font = { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FF757575' } }
    })

    ws.addRow([''])

    const totalRevenue = exportCustomers.reduce((sum, c) => sum + (c.repairCost ? Number(c.repairCost) : 0), 0)
    const totalRow = ws.addRow(['', '', '', '', '', '', '', '', '', '', 'Tổng cộng:', totalRevenue, '', '', '', ''])
    totalRow.height = 26
    for (let i = 1; i <= 16; i++) {
      const cell = totalRow.getCell(i)
      cell.font = fontTotal
      cell.fill = fillTotal
      cell.border = totalBorder
      if (i === 11) cell.alignment = alignRight
      else if (i === 12) { cell.alignment = alignRight; cell.numFmt = '#,##0' }
      else cell.alignment = alignLeft
    }

    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `khach-hang-${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    setCurrentPage(1)
    loadData(1, status, dateFrom, dateTo)
  }

  const handleDateFromChange = (value: string) => {
    setDateFrom(value)
    setCurrentPage(1)
    loadData(1, statusFilter, value, dateTo)
  }

  const handleDateToChange = (value: string) => {
    setDateTo(value)
    setCurrentPage(1)
    loadData(1, statusFilter, dateFrom, value)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadData(page, statusFilter, dateFrom, dateTo)
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/sign-in')
    router.refresh()
  }

  const handleAddCustomer = () => {
    setEditingCustomer(null)
    setFormOpen(true)
  }

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormOpen(true)
  }

  const handlePrintInvoice = (customer: Customer) => {
    setPrintingCustomer(customer)
    setPrintOpen(true)
  }

  const statusHistory = editingCustomer ? parseStatusHistory(editingCustomer.statusHistory) : []
  const hasActiveFilters = Boolean(searchQuery.trim() || statusFilter || dateFrom || dateTo)

  const statCards = [
    { label: 'Chờ sửa', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', iconBg: 'bg-amber-100' },
    { label: 'Đang sửa', value: stats.repairing, icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-blue-100' },
    { label: 'Đã xong', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', iconBg: 'bg-emerald-100' },
    { label: 'Đã trả máy', value: stats.returned, icon: RotateCcw, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', iconBg: 'bg-gray-100' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3" style={{ maxWidth: '1920px' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-blue-600 text-white">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">
                  Sửa chữa điện tử
                </h1>
                <p className="text-xs text-slate-400 leading-tight">Quản lý khách hàng</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => router.push('/admin')}
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900 gap-1.5"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Quản trị</span>
              </Button>
              <div className="h-5 w-px bg-slate-200" />
              <div className="flex items-center gap-2 px-2">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name || 'U'} className="h-7 w-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <span className="text-sm text-slate-700 hidden sm:inline">{user?.name || 'Người dùng'}</span>
                {user?.role === 'admin' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">ADMIN</span>
                )}
                {user?.role === 'admin' && (
                  <button
                    onClick={() => {
                      const next = !viewAll
                      setViewAll(next)
                      loadData(1, '', '', '', next)
                    }}
                    className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full transition-colors ${
                      viewAll
                        ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    title={viewAll ? 'Chỉ xem đơn của tôi' : 'Xem tất cả đơn'}
                  >
                    {viewAll ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {viewAll ? 'Tất cả đơn' : 'Đơn của tôi'}
                  </button>
                )}
                {user?.role === 'admin' && viewAll && (
                  <span className="flex items-center gap-1.5 text-[10px] text-gray-400 ml-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                    </span>
                    Live
                  </span>
                )}
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-red-600 gap-1.5"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ maxWidth: '1920px' }}>
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {statCards.map((s) => (
            <div
              key={s.label}
              className={`flex items-center gap-3 rounded-xl border ${s.border} ${s.bg} p-4 transition-all hover:shadow-sm`}
            >
              <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${s.iconBg} ${s.color} shrink-0`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color} leading-tight`}>{s.value}</p>
              </div>
            </div>
          ))}
          {/* Revenue card */}
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 transition-all hover:shadow-sm col-span-2 lg:col-span-1">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 font-medium">Doanh thu</p>
              <p className="text-2xl font-bold text-emerald-600 leading-tight">
                {hideRevenue ? '••••••' : <>{stats.totalRevenue?.toLocaleString('vi-VN')}<span className="text-sm font-medium">đ</span></>}
              </p>
            </div>
            <button
              onClick={() => setHideRevenue((v) => !v)}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 transition-colors shrink-0"
              title={hideRevenue ? 'Hiện doanh thu' : 'Ẩn doanh thu'}
            >
              {hideRevenue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 border-b border-slate-100">
            <div className="flex-1">
              <SearchFilter
                onSearch={handleSearch}
                onExport={handleExport}
                onStatusFilter={handleStatusFilter}
                currentStatus={statusFilter}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateFromChange={handleDateFromChange}
                onDateToChange={handleDateToChange}
              />
            </div>
            <Button
              onClick={handleAddCustomer}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 h-9 px-4 rounded-lg shadow-sm shrink-0"
            >
              <Plus className="h-4 w-4" />
              Thêm khách hàng
            </Button>
          </div>

          {/* Table */}
          <div className="p-4 pt-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                <p className="text-sm">Đang tải dữ liệu...</p>
              </div>
            ) : (
              <CustomerTable
                customers={filteredCustomers}
                hasFilters={hasActiveFilters}
                onEdit={handleEditCustomer}
                onRefresh={() => silentRefresh()}
                onCustomersUpdate={(updated) => {
                  setCustomers(updated)
                  setFilteredCustomers(updated)
                }}
                onStatsRefresh={refreshStats}
                onPrint={handlePrintInvoice}
                onViewStatusHistory={(customer) => setStatusHistoryCustomer(customer)}
                page={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </div>

        </div>
      </main>

      {/* Dialogs */}
      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editingCustomer}
        onSuccess={loadData}
      />

      {printingCustomer && (
        <PrintInvoice
          customer={printingCustomer}
          open={printOpen}
          onOpenChange={setPrintOpen}
        />
      )}

      {/* Status history side panel */}
      {statusHistoryCustomer && (
        <Sheet
          open={!!statusHistoryCustomer}
          onClose={() => setStatusHistoryCustomer(null)}
          title="Lịch sử trạng thái"
        >
          <div className="space-y-4">
            {/* Customer info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{statusHistoryCustomer.customerName}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{statusHistoryCustomer.ticketId}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  statusHistoryCustomer.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  statusHistoryCustomer.status === 'repairing' ? 'bg-blue-100 text-blue-700' :
                  statusHistoryCustomer.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {getStatusLabel(statusHistoryCustomer.status)}
                </span>
              </div>
            </div>

            {/* Timeline */}
            {(() => {
              const entries = parseStatusHistory(statusHistoryCustomer.statusHistory)
              return entries.length > 0 ? (
                <div className="relative pl-6">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                  <div className="space-y-4">
                    {entries.map((entry, index) => (
                      <div key={`${entry.date}-${index}`} className="relative flex gap-3">
                        <div className={`absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 border-white shadow-sm ${
                          index === entries.length - 1 ? 'bg-blue-500' : 'bg-slate-300'
                        }`} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-700">{getStatusLabel(entry.status)}</p>
                          <p className="text-xs text-slate-400">{formatTimelineDate(entry.date)}</p>
                          {entry.by && <p className="text-xs text-slate-400">Bởi: {entry.by}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">Chưa có lịch sử trạng thái.</p>
              )
            })()}
          </div>
        </Sheet>
      )}
    </div>
  )
}

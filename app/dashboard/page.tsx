'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ExcelJS from 'exceljs'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CustomerForm } from '@/components/customer-form'
import { CustomerTable } from '@/components/customer-table'
import { SearchFilter } from '@/components/search-filter'
import { PrintInvoice } from '@/components/print-invoice'
import { Sheet } from '@/components/ui/sheet'
import { getCustomers, getCustomerStats, getCustomerStaffNames } from '@/app/actions/customers'
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
  Eye,
  EyeOff,
  Printer,
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [statusHistoryCustomer, setStatusHistoryCustomer] = useState<Customer | null>(null)
  const [user, setUser] = useState<{ name: string; email: string; role: string; status: string; avatar?: string | null; canAddOptions?: boolean; permissions?: string | null } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [staffFilter, setStaffFilter] = useState('')
  const [staffOptions, setStaffOptions] = useState<{ name: string; role: string }[]>([])
  const [hideRevenue, setHideRevenue] = useState(false)
  const [viewAll, setViewAll] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadData = async (
    page: number = currentPage,
    search: string = searchQuery,
    status: string = statusFilter,
    fromDate: string = dateFrom,
    toDate: string = dateTo,
    showAll: boolean = viewAll,
    staffName: string = staffFilter
  ) => {
    try {
      setLoading(true)
      // Load data first — show results immediately
      const result = await getCustomers(
        search || undefined,
        'recent',
        page,
        13,
        status || undefined,
        fromDate || undefined,
        toDate || undefined,
        showAll || undefined,
        staffName || undefined
      )
      setCustomers(result.data)
      setTotalPages(result.totalPages)
      setCurrentPage(result.page)
      setLastUpdated(new Date())

      // Load stats in background — don't block UI
      getCustomerStats(showAll || undefined, staffName || undefined).then((statsData) => {
        setStats(statsData)
      }).catch(() => {})

    } catch (error: unknown) {
      console.error('Error loading data:', error instanceof Error ? error.message : 'Unknown error')
      toast.error('Lỗi tải dữ liệu. Vui lòng thử lại.')
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const refreshStats = async () => {
    try {
      const statsData = await getCustomerStats(viewAll || undefined, staffFilter || undefined)
      setStats(statsData)
    } catch {
      // silent — stats will refresh on next full load
    }
  }

  // Silent refresh for dashboard (no loading spinner)
  const clearSearchDebounce = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = null
    }
  }

  const silentRefresh = async () => {
    try {
      const result = await getCustomers(
        searchQuery || undefined,
        'recent',
        currentPage,
        13,
        statusFilter || undefined,
        dateFrom || undefined,
        dateTo || undefined,
        viewAll || undefined,
        staffFilter || undefined
      )
      setCustomers(result.data)
      setTotalPages(result.totalPages)
      setLastUpdated(new Date())

      // Stats in background
      getCustomerStats(viewAll || undefined, staffFilter || undefined).then((statsData) => {
        setStats(statsData)
      }).catch(() => {})
    } catch {
      // silent — keep existing data
    }
  }

  useEffect(() => {
    void Promise.all([
      getCurrentUser().then((u) => {
        if (!u) {
          setUser(null)
          router.push('/sign-in')
          return
        }
        const userData = u as any
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
        setUser({ name: userData.name || '', email: userData.email, role: userData.role, status: userData.status, avatar: userData.avatar, canAddOptions: userData.canAddOptions, permissions: userData.permissions })
        // Preload staff options for admin
        if (userData.role === 'admin') {
          getCustomerStaffNames(true).then(setStaffOptions).catch(() => {})
        }
      }),
      loadData(1, searchQuery, statusFilter, dateFrom, dateTo, viewAll, staffFilter),
    ]).catch(() => {})
  }, [])

  // Auto-refresh: admin 3s, staff 5s
  useEffect(() => {
    const intervalMs = user?.role === 'admin' ? 3000 : 5000
    const interval = setInterval(() => { void silentRefresh() }, intervalMs)
    return () => clearInterval(interval)
  }, [user?.role, currentPage, statusFilter, dateFrom, dateTo, searchQuery, staffFilter, viewAll])

  // Refresh on tab focus
  useEffect(() => {
    const onFocus = () => { void silentRefresh() }
    const onVisible = () => { if (document.visibilityState === 'visible') void silentRefresh() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [currentPage, statusFilter, dateFrom, dateTo, searchQuery, staffFilter, viewAll])

  useEffect(() => () => {
    clearSearchDebounce()
  }, [])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
    clearSearchDebounce()
    searchDebounceRef.current = setTimeout(() => {
      void loadData(1, query, statusFilter, dateFrom, dateTo, viewAll, staffFilter)
    }, 300)
  }

  const handleExport = async () => {
    try {
      const exportResult = await getCustomers(
        searchQuery || undefined,
        'recent',
        1,
        undefined,
        statusFilter || undefined,
        dateFrom || undefined,
        dateTo || undefined,
        viewAll || undefined,
        staffFilter || undefined
      )

      const exportCustomers = exportResult.data
      if (exportCustomers.length === 0) {
        toast.warning('Không có dữ liệu để xuất')
        return
      }

      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Khách hàng')
      worksheet.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Mã phiếu', key: 'ticketId', width: 12 },
        { header: 'Khách hàng', key: 'customerName', width: 20 },
        { header: 'SĐT', key: 'phone', width: 14 },
        { header: 'Ngày nhận', key: 'receivedDate', width: 18 },
        { header: 'Người nhận', key: 'receivedBy', width: 16 },
        { header: 'Hiệu máy', key: 'deviceType', width: 14 },
        { header: 'Model', key: 'deviceModel', width: 16 },
        { header: 'Phụ kiện', key: 'accessories', width: 18 },
        { header: 'Trước khi sửa', key: 'conditionBefore', width: 18 },
        { header: 'Sau khi sửa', key: 'conditionAfter', width: 18 },
        { header: 'Giá sửa (VNĐ)', key: 'repairCost', width: 16 },
        { header: 'Người sửa', key: 'repairedBy', width: 16 },
        { header: 'Trạng thái', key: 'status', width: 14 },
        { header: 'Ngày trả', key: 'returnedDate', width: 18 },
        { header: 'Ghi chú', key: 'notes', width: 24 },
      ]

      const statusLabel = (status: string) => {
        switch (status) {
          case 'pending': return 'Chờ sửa'
          case 'repairing': return 'Đang sửa'
          case 'completed': return 'Đã xong'
          case 'returned': return 'Đã trả máy'
          default: return status
        }
      }

      exportCustomers.forEach((customer, index) => {
        worksheet.addRow({
          stt: index + 1,
          ticketId: customer.ticketId,
          customerName: customer.customerName,
          phone: customer.phone,
          receivedDate: customer.receivedDate
            ? new Date(customer.receivedDate).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })
            : '',
          receivedBy: customer.receivedBy || '',
          deviceType: customer.deviceType,
          deviceModel: customer.deviceModel || '',
          accessories: customer.accessories || '',
          conditionBefore: customer.conditionBefore || '',
          conditionAfter: customer.conditionAfter || '',
          repairCost: customer.repairCost ? Number(customer.repairCost) : '',
          repairedBy: customer.repairedBy || '',
          status: statusLabel(customer.status),
          returnedDate: customer.returnedDate
            ? new Date(customer.returnedDate).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })
            : '',
          notes: customer.notes || '',
        })
      })

      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true }
      headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `khach-hang-${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error('Không thể xuất Excel: ' + (error instanceof Error ? error.message : 'Không xác định'))
    }
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    setCurrentPage(1)
    clearSearchDebounce()
    void loadData(1, searchQuery, status, dateFrom, dateTo, viewAll, staffFilter)
  }

  const handleDateFromChange = (value: string) => {
    setDateFrom(value)
    setCurrentPage(1)
    clearSearchDebounce()
    void loadData(1, searchQuery, statusFilter, value, dateTo, viewAll, staffFilter)
  }

  const handleDateToChange = (value: string) => {
    setDateTo(value)
    setCurrentPage(1)
    clearSearchDebounce()
    void loadData(1, searchQuery, statusFilter, dateFrom, value, viewAll, staffFilter)
  }

  const handleStaffFilterChange = (value: string) => {
    setStaffFilter(value)
    setCurrentPage(1)
    clearSearchDebounce()
    void loadData(1, searchQuery, statusFilter, dateFrom, dateTo, viewAll, value)
  }

  const handleClearFilters = () => {
    clearSearchDebounce()
    setSearchQuery('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
    setStaffFilter('')
    setCurrentPage(1)
    void loadData(1, '', '', '', '', viewAll, '')
  }

  const handlePageChange = (page: number) => {
    const nextPage = Math.min(Math.max(1, page), totalPages)
    clearSearchDebounce()
    setCurrentPage(nextPage)
    void loadData(nextPage, searchQuery, statusFilter, dateFrom, dateTo, viewAll, staffFilter)
  }

  const handleToggleViewAll = async (showAll?: boolean, staffName?: string) => {
    const next = showAll !== undefined ? showAll : !viewAll
    clearSearchDebounce()
    setViewAll(next)
    if (!next) {
      setStaffFilter('')
    }
    if (next) {
      try {
        const options = await getCustomerStaffNames(true)
        setStaffOptions(options)
      } catch {
        setStaffOptions([])
      }
    }
    // Determine staff filter: explicit staffName, or clear if switching to "all" or "mine"
    let nextStaff = ''
    if (next && staffName !== undefined) {
      nextStaff = staffName
      setStaffFilter(staffName)
    } else {
      setStaffFilter('')
    }
    setCurrentPage(1)
    await loadData(1, searchQuery, statusFilter, dateFrom, dateTo, next, nextStaff)
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

  const hasActiveFilters = Boolean(searchQuery.trim() || statusFilter || dateFrom || dateTo || staffFilter)

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
              {(() => {
                const isAdmin = user?.role === 'admin'
                const canAdd = user?.canAddOptions === true
                let canSeeReports = false
                let canSeeLogs = false
                try {
                  const perms = user?.permissions ? JSON.parse(user.permissions) : {}
                  canSeeReports = !!perms?.tabs?.reports
                  canSeeLogs = !!perms?.tabs?.logs
                } catch {}
                const canAccessAdmin = isAdmin || canAdd || canSeeReports || canSeeLogs
                return canAccessAdmin ? (
              <Button
                onClick={() => router.push('/admin')}
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900 gap-1.5"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">{isAdmin ? 'Quản trị' : 'Tùy chọn'}</span>
              </Button>
                ) : null
              })()}
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
                  <select
                    value={!viewAll ? '__mine__' : staffFilter || '__all__'}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '__mine__') {
                        void handleToggleViewAll(false)
                      } else if (val === '__all__') {
                        void handleToggleViewAll(true)
                      } else {
                        void handleToggleViewAll(true, val)
                      }
                    }}
                    className="h-7 rounded-full border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 transition-colors outline-none hover:border-indigo-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 cursor-pointer"
                    aria-label="Chọn xem đơn theo"
                  >
                    <option value="__mine__">Đơn của tôi</option>
                    <option value="__all__">Tất cả đơn</option>
                    {staffOptions.filter((s) => s.role === 'admin' && s.name !== user?.name).length > 0 && (
                      <optgroup label="─ Admin ─">
                        {staffOptions.filter((s) => s.role === 'admin' && s.name !== user?.name).map((s) => (
                          <option key={s.name} value={s.name}>{s.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {staffOptions.filter((s) => s.role === 'staff').length > 0 && (
                      <optgroup label="─ Nhân viên ─">
                        {staffOptions.filter((s) => s.role === 'staff').map((s) => (
                          <option key={s.name} value={s.name}>{s.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
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
                aria-label="Đăng xuất"
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
              aria-label={hideRevenue ? 'Hiện doanh thu' : 'Ẩn doanh thu'}
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
                searchTerm={searchQuery}
                onSearch={handleSearch}
                onClearFilters={handleClearFilters}
                onExport={handleExport}
                onStatusFilter={handleStatusFilter}
                currentStatus={statusFilter}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateFromChange={handleDateFromChange}
                onDateToChange={handleDateToChange}
                staffName={staffFilter}
                staffOptions={staffOptions}
                onStaffNameChange={handleStaffFilterChange}
                showStaffFilter={false}
              />
            </div>
            <Button
              onClick={handleAddCustomer}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 h-9 px-4 rounded-lg shadow-sm shrink-0"
            >
              <Plus className="h-4 w-4" />
              Thêm khách hàng
            </Button>
            {selectedIds.size > 0 && (
              <Button
                onClick={() => window.open(`/print/bulk?ids=${Array.from(selectedIds).join(',')}`, '_blank')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 h-9 px-4 rounded-lg shadow-sm shrink-0"
              >
                <Printer className="h-4 w-4" />
                In ({selectedIds.size})
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="p-4 pt-0">
            {loading ? (
              <div className="animate-pulse space-y-3 p-4">
                <div className="h-10 bg-muted rounded w-full" />
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded w-full" />
                ))}
              </div>
            ) : (
              <CustomerTable
                customers={customers}
                hasFilters={hasActiveFilters}
                onEdit={handleEditCustomer}
                onRefresh={() => silentRefresh()}
                onCustomersUpdate={(updated) => {
                  setCustomers(updated)
                }}
                onStatsRefresh={refreshStats}
                onPrint={handlePrintInvoice}
                onViewStatusHistory={(customer) => setStatusHistoryCustomer(customer)}
                page={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                selectedIds={selectedIds}
                onSelect={setSelectedIds}
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

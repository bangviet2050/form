'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CustomerForm } from '@/components/customer-form'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card'
import { getOptions, addOption, deleteOption, updateOption, type PredefinedCategory } from '@/app/actions/options'
import { getCurrentUser, signOut } from '@/app/actions/auth'
import { getUsers, getUserStats, approveUser, rejectUser, changeUserRole, toggleCanAddOptions, deleteUser, deleteUserWithOrders, getStaffCustomerCounts, getAllCustomers, getAllCustomerStats, getAdminStaffData, updateStaffPermissions } from '@/app/actions/users'
import { DEFAULT_PERMISSIONS, type StaffPermissions } from '@/lib/permissions'
import { getRevenueByMonth, getDeviceStats, getCompletionRate, getStaffPerformance, exportOrdersExcel, exportRevenueExcel, exportStaffPerformanceExcel, getReportData } from '@/app/actions/analytics'
import { getActivityLogs, getActivityStats, deleteAllLogs } from '@/app/actions/activity-log'
import { Plus, Trash2, ArrowLeft, LogOut, Settings, Cpu, Smartphone, Cable, ClipboardList, ClipboardCheck, UserCheck, Wrench, Pencil, ChevronDown, ChevronRight, Users, UserPlus, Shield, ShieldCheck, XCircle, Trash, Loader2, Clock, Search, ChevronLeft, FileText, BarChart3, Download, Activity, Filter, KeyRound, FilePlus, UserX, UserMinus } from 'lucide-react'

interface OptionItem {
  id: number
  category: string
  value: string
  parentValue: string | null
}

const CATEGORIES: { key: PredefinedCategory; label: string; icon: typeof Smartphone; color: string; bg: string; border: string; badge: string }[] = [
  { key: 'deviceType', label: 'Hiệu máy', icon: Smartphone, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  { key: 'deviceModel', label: 'Model máy', icon: Cpu, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
  { key: 'accessories', label: 'Phụ kiện', icon: Cable, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  { key: 'conditionBefore', label: 'Tình trạng trước sửa', icon: ClipboardList, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
  { key: 'conditionAfter', label: 'Tình trạng sau sửa', icon: ClipboardCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  { key: 'receivedBy', label: 'Người nhận máy', icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', badge: 'bg-teal-100 text-teal-700' },
  { key: 'repairedBy', label: 'Người sửa máy', icon: Wrench, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700' },
]

export default function AdminPage() {
  const router = useRouter()
  const [options, setOptions] = useState<OptionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newValues, setNewValues] = useState<Record<PredefinedCategory, string>>({
    deviceType: '',
    deviceModel: '',
    accessories: '',
    conditionBefore: '',
    conditionAfter: '',
    receivedBy: '',
    repairedBy: '',
  })
  const [selectedBrand, setSelectedBrand] = useState('')
  const [adding, setAdding] = useState<PredefinedCategory | null>(null)
  const [user, setUser] = useState<{ id: string; name: string; role: string; canAddOptions: boolean; permissions?: string | null; avatar?: string | null } | null>(null)
  const [editingOptionId, setEditingOptionId] = useState<number | null>(null)
  const [editingOptionValue, setEditingOptionValue] = useState('')
  const [savingOptionId, setSavingOptionId] = useState<number | null>(null)
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'options' | 'users' | 'orders' | 'reports' | 'logs'>('options')
  const [userList, setUserList] = useState<any[]>([])
  const [userStats, setUserStats] = useState({ total: 0, pending: 0, approved: 0, staff: 0 })
  const [customerCounts, setCustomerCounts] = useState<Record<string, { total: number; pending: number; repairing: number; completed: number; returned: number; revenue: number }>>({})
  const [usersLoading, setUsersLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [adminFormOpen, setAdminFormOpen] = useState(false)
  const [adminEditingCustomer, setAdminEditingCustomer] = useState<any>(null)
  const [deleteUserDialog, setDeleteUserDialog] = useState<{ open: boolean; userId: string; userName: string; orderCount: number }>({ open: false, userId: '', userName: '', orderCount: 0 })
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [allOrdersTotal, setAllOrdersTotal] = useState(0)
  const [allOrdersPages, setAllOrdersPages] = useState(1)
  const [allOrdersPage, setAllOrdersPage] = useState(1)
  const [allOrdersStats, setAllOrdersStats] = useState({ totalCustomers: 0, pending: 0, repairing: 0, completed: 0, returned: 0, totalRevenue: 0 })
  const [allOrdersSearch, setAllOrdersSearch] = useState('')
  const [allOrdersStatus, setAllOrdersStatus] = useState('')
  const [allOrdersStaff, setAllOrdersStaff] = useState('')
  const [allOrdersLoading, setAllOrdersLoading] = useState(false)
  // Reports state
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [deviceStats, setDeviceStats] = useState<any[]>([])
  const [completionRate, setCompletionRate] = useState<any>({})
  const [staffPerf, setStaffPerf] = useState<any[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  // Activity logs state
  const [logs, setLogs] = useState<any[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsPages, setLogsPages] = useState(1)
  const [logsPage, setLogsPage] = useState(1)
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsActionFilter, setLogsActionFilter] = useState('')
  const [logsUserFilter, setLogsUserFilter] = useState('')
  const [logsDateFrom, setLogsDateFrom] = useState('')
  const [logsDateTo, setLogsDateTo] = useState('')
  // Cache flags — don't reload data when switching back to same tab
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set())
  // Real-time refresh
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({ open: false, title: '', description: '', onConfirm: () => {} })
  // Users tab search + filter
  const [usersSearch, setUsersSearch] = useState('')
  const [usersStatusFilter, setUsersStatusFilter] = useState('')
  const [permDialogOpen, setPermDialogOpen] = useState(false)
  const [permDialogUserId, setPermDialogUserId] = useState('')
  const [permDialogUserName, setPermDialogUserName] = useState('')
  const [permDialogPerms, setPermDialogPerms] = useState<StaffPermissions>(DEFAULT_PERMISSIONS)
  const filteredUsers = userList.filter((u: any) => {
    const matchSearch = !usersSearch || (u.name || '').toLowerCase().includes(usersSearch.toLowerCase()) || (u.email || '').toLowerCase().includes(usersSearch.toLowerCase())
    const matchStatus = !usersStatusFilter || u.status === usersStatusFilter
    return matchSearch && matchStatus
  })

  useEffect(() => {
    loadData()
    getCurrentUser().then((u) => {
      if (!u) { setUser(null); router.push('/sign-in'); return }
      const userData = u as any
      if (userData.status === 'deleted') {
        signOut().then(() => {
          router.push('/sign-in?error=' + encodeURIComponent('Tài khoản đã bị xóa.'))
        })
        return
      }
      setUser(userData ? { id: userData.id, name: userData.name, role: userData.role, canAddOptions: userData.canAddOptions, permissions: userData.permissions, avatar: userData.avatar } : null)
    })
  }, [])

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const data = await getAdminStaffData()
      setUserList(data.users as any[])
      setUserStats(data.stats as any)
      setCustomerCounts(data.customerCounts as any)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi tải danh sách nhân viên')
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    if (loadedTabs.has(activeTab)) return
    setLoadedTabs(prev => new Set(prev).add(activeTab))

    if (activeTab === 'users') {
      loadUsers()
    }
    if (activeTab === 'orders') {
      loadAllOrders()
    }
    if (activeTab === 'reports') {
      loadReports()
    }
    if (activeTab === 'logs') {
      loadLogs()
    }
  }, [activeTab])

  // Reload reports when year changes
  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports()
    }
  }, [reportYear])

  const loadAllOrders = async (page: number = 1, search: string = allOrdersSearch, status: string = allOrdersStatus, staffId: string = allOrdersStaff) => {
    setAllOrdersLoading(true)
    try {
      const result = await getAllCustomers(search || undefined, page, 10, status || undefined, undefined, undefined, staffId || undefined)
      setAllOrders(result.data as any[])
      setAllOrdersPages(result.totalPages)
      setAllOrdersPage(result.page)
      setAllOrdersTotal(result.totalCount)
      setAllOrdersStats(result.stats as any)
      setLastUpdated(new Date())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi tải đơn hàng')
    } finally {
      setAllOrdersLoading(false)
    }
  }

  // Silent refresh — updates data without showing loading spinner
  const refreshAllOrders = async () => {
    try {
      const result = await getAllCustomers(allOrdersSearch || undefined, allOrdersPage, 10, allOrdersStatus || undefined, undefined, undefined, allOrdersStaff || undefined)
      setAllOrders(result.data as any[])
      setAllOrdersPages(result.totalPages)
      setAllOrdersTotal(result.totalCount)
      setAllOrdersStats(result.stats as any)
      setLastUpdated(new Date())
    } catch {
      // silent — keep existing data
    }
  }

  // Silent refresh for users tab
  const refreshUsers = async () => {
    try {
      const data = await getAdminStaffData()
      setUserList(data.users as any[])
      setUserStats(data.stats as any)
      setCustomerCounts(data.customerCounts as any)
    } catch {
      // silent
    }
  }

  // Silent refresh for logs tab
  const refreshLogs = async () => {
    try {
      const result = await getActivityLogs(logsPage, 20, logsActionFilter || undefined, logsUserFilter || undefined, logsDateFrom || undefined, logsDateTo || undefined)
      setLogs(result.data as any[])
      setLogsPages(result.totalPages)
      setLogsTotal(result.totalCount)
      setLastUpdated(new Date())
    } catch {
      // silent
    }
  }

  // Unified auto-refresh: every 8s for current tab
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'orders') refreshAllOrders()
      else if (activeTab === 'users') refreshUsers()
      else if (activeTab === 'logs') refreshLogs()
    }, 8000)
    return () => clearInterval(interval)
  }, [activeTab, allOrdersPage, allOrdersSearch, allOrdersStatus, allOrdersStaff, logsPage, logsActionFilter])

  // Refresh when window regains focus
  useEffect(() => {
    const onFocus = () => {
      if (activeTab === 'orders') refreshAllOrders()
      else if (activeTab === 'users') refreshUsers()
      else if (activeTab === 'logs') refreshLogs()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [activeTab, allOrdersPage, allOrdersSearch, allOrdersStatus, allOrdersStaff, logsPage, logsActionFilter])

  const loadReports = async () => {
    setReportsLoading(true)
    try {
      const data = await getReportData(reportYear)
      setRevenueData(data.revenueData as any[])
      setDeviceStats(data.deviceStats as any[])
      setCompletionRate(data.completionRate as any)
      setStaffPerf(data.staffPerf as any[])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi tải báo cáo')
    } finally {
      setReportsLoading(false)
    }
  }

  const loadLogs = async (page: number = 1, actionFilter: string = logsActionFilter, userFilter: string = logsUserFilter, dateFrom: string = logsDateFrom, dateTo: string = logsDateTo) => {
    setLogsLoading(true)
    try {
      const result = await getActivityLogs(page, 20, actionFilter || undefined, userFilter || undefined, dateFrom || undefined, dateTo || undefined)
      setLogs(result.data as any[])
      setLogsPages(result.totalPages)
      setLogsPage(result.page)
      setLogsTotal(result.totalCount)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi tải nhật ký')
    } finally {
      setLogsLoading(false)
    }
  }

  const handleExport = async (type: 'orders' | 'revenue' | 'staff') => {
    try {
      let base64: string
      let filename: string
      if (type === 'orders') {
        base64 = await exportOrdersExcel(allOrdersStatus || undefined, undefined, undefined, allOrdersStaff || undefined)
        filename = 'don-hang.xlsx'
      } else if (type === 'revenue') {
        base64 = await exportRevenueExcel(reportYear)
        filename = `doanh-thu-${reportYear}.xlsx`
      } else {
        base64 = await exportStaffPerformanceExcel()
        filename = 'hieu-suat-nhan-vien.xlsx'
      }
      const bytes = atob(base64)
      const buf = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i)
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Đã xuất file Excel!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi xuất file')
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getOptions()
      setOptions(data as OptionItem[])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const deviceTypes = options.filter((o) => o.category === 'deviceType')

  const handleAdd = async (category: PredefinedCategory, parentValue?: string) => {
    const value = newValues[category].trim()
    if (!value) return
    if (category === 'deviceModel' && !parentValue) {
      toast.warning('Vui lòng chọn hiệu máy trước')
      return
    }

    setAdding(category)
    try {
      await addOption(category, value, parentValue)
      setNewValues((prev) => ({ ...prev, [category]: '' }))
      await loadData()
      toast.success('Đã thêm thành công!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi thêm')
    } finally {
      setAdding(null)
    }
  }

  const handleDelete = (id: number) => {
    const option = options.find((o) => o.id === id)
    const performDelete = () => {
      void (async () => {
        try {
          await deleteOption(id)
          await loadData()
          toast.success('Đã xóa thành công!')
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Lỗi xóa')
        }
      })()
    }

    if (option?.category === 'deviceType') {
      const modelCount = options.filter(
        (o) => o.category === 'deviceModel' && o.parentValue === option.value
      ).length
      setConfirmDialog({
        open: true,
        title: 'Xóa hiệu máy',
        description:
          modelCount > 0
            ? `Xóa "${option.value}" sẽ xóa luôn ${modelCount} model liên kết. Tiếp tục?`
            : 'Xóa mục này?',
        onConfirm: performDelete,
      })
      return
    }

    setConfirmDialog({
      open: true,
      title: 'Xóa tùy chọn',
      description: 'Xóa mục này?',
      onConfirm: performDelete,
    })
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/sign-in')
    router.refresh()
  }

  const handleApprove = async (userId: string) => {
    setActionLoading(userId)
    try {
      await approveUser(userId)
      toast.success('Đã phê duyệt tài khoản!')
      await loadUsers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi phê duyệt')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = (userId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Từ chối nhân viên',
      description: 'Từ chối tài khoản này? Nhân viên sẽ không thể đăng nhập.',
      onConfirm: () => {
        setActionLoading(userId)
        void (async () => {
          try {
            await rejectUser(userId)
            toast.success('Đã từ chối tài khoản!')
            await loadUsers()
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Lỗi từ chối')
          } finally {
            setActionLoading(null)
          }
        })()
      },
    })
  }

  const handleRoleChange = async (userId: string, role: 'admin' | 'staff') => {
    setActionLoading(userId)
    try {
      await changeUserRole(userId, role)
      toast.success('Đã thay đổi vai trò!')
      await loadUsers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi thay đổi vai trò')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleAddOptions = async (userId: string, canAdd: boolean) => {
    setActionLoading(userId)
    try {
      await toggleCanAddOptions(userId, canAdd)
      toast.success(canAdd ? 'Đã cấp quyền thêm tùy chọn!' : 'Đã thu hồi quyền thêm tùy chọn!')
      await loadUsers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi thay đổi quyền')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteUser = (userId: string, userName: string) => {
    // Find order count for this user
    const counts = customerCounts[userId]
    const orderCount = counts?.total || 0
    setDeleteUserDialog({ open: true, userId, userName, orderCount })
  }

  const handleDeleteUserOnly = async () => {
    const userId = deleteUserDialog.userId
    setActionLoading(userId)
    try {
      await deleteUser(userId)
      toast.success('Đã xóa tài khoản! Đơn hàng được giữ lại.')
      setDeleteUserDialog({ open: false, userId: '', userName: '', orderCount: 0 })
      await loadUsers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi xóa tài khoản')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteUserAndOrders = async () => {
    const userId = deleteUserDialog.userId
    setActionLoading(userId)
    try {
      await deleteUserWithOrders(userId)
      toast.success('Đã xóa tài khoản và tất cả đơn hàng!')
      setDeleteUserDialog({ open: false, userId: '', userName: '', orderCount: 0 })
      await loadUsers()
      await loadAllOrders()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi xóa tài khoản')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteAllLogs = async () => {
    try {
      await deleteAllLogs()
      toast.success('Đã xóa toàn bộ nhật ký hoạt động!')
      await loadLogs(1)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi xóa nhật ký')
    }
  }

  const openPermDialog = (userId: string, userName: string, currentPerms: string | null) => {
    setPermDialogUserId(userId)
    setPermDialogUserName(userName)

    let parsedPermissions = DEFAULT_PERMISSIONS
    try {
      if (currentPerms) {
        parsedPermissions = JSON.parse(currentPerms)
      }
    } catch {
      parsedPermissions = DEFAULT_PERMISSIONS
    }

    setPermDialogPerms({ ...DEFAULT_PERMISSIONS, ...parsedPermissions })
    setPermDialogOpen(true)
  }

  const handleSavePermissions = async () => {
    setActionLoading(permDialogUserId)
    try {
      await updateStaffPermissions(permDialogUserId, permDialogPerms)
      toast.success('Đã cập nhật quyền!')
      setPermDialogOpen(false)
      await loadUsers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi cập nhật quyền')
    } finally {
      setActionLoading(null)
    }
  }

  const getOptionsByCategory = (category: PredefinedCategory) =>
    options.filter((o) => o.category === category)

  const getModelsGroupedByBrand = () => {
    const models = getOptionsByCategory('deviceModel')
    const grouped: Record<string, OptionItem[]> = {}
    for (const m of models) {
      const brand = m.parentValue || 'Khác'
      if (!grouped[brand]) grouped[brand] = []
      grouped[brand].push(m)
    }
    return grouped
  }

  const toggleBrand = (brand: string) => {
    setExpandedBrands((prev) => {
      const next = new Set(prev)
      if (next.has(brand)) next.delete(brand)
      else next.add(brand)
      return next
    })
  }

  const startEditing = (item: OptionItem) => {
    setEditingOptionId(item.id)
    setEditingOptionValue(item.value)
  }

  const cancelEditing = () => {
    setEditingOptionId(null)
    setEditingOptionValue('')
    setSavingOptionId(null)
  }

  const saveEditing = async (item: OptionItem) => {
    if (savingOptionId === item.id) return
    const trimmed = editingOptionValue.trim()
    if (!trimmed) {
      toast.warning('Giá trị không được để trống')
      return
    }
    setSavingOptionId(item.id)
    try {
      await updateOption(item.id, trimmed)
      await loadData()
      cancelEditing()
      toast.success('Đã cập nhật thành công!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi cập nhật')
    } finally {
      setSavingOptionId(null)
    }
  }

  const isAdmin = user?.role === 'admin'
  const canAdd = isAdmin || user?.canAddOptions === true
  let userPerms: StaffPermissions = DEFAULT_PERMISSIONS
  try {
    if (user?.permissions) {
      userPerms = { ...DEFAULT_PERMISSIONS, ...JSON.parse(user.permissions) }
    }
  } catch {
    userPerms = DEFAULT_PERMISSIONS
  }
  const hasCategoryPerm = (key: keyof StaffPermissions['categories']) => isAdmin || userPerms.categories[key]
  const hasTabPerm = (key: keyof StaffPermissions['tabs']) => isAdmin || userPerms.tabs[key]
  const visibleCategories = CATEGORIES.filter(cat => isAdmin || hasCategoryPerm(cat.key as keyof StaffPermissions['categories']))

  const renderPill = (item: OptionItem, cat: typeof CATEGORIES[number]) => {
    const isEditing = editingOptionId === item.id
    return (
      <div
        key={item.id}
        className={`group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border transition-all ${cat.bg} ${cat.border} hover:shadow-sm`}
      >
        {isEditing ? (
          <Input
            autoFocus
            value={editingOptionValue}
            onChange={(e) => setEditingOptionValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); void saveEditing(item) }
              if (e.key === 'Escape') { e.preventDefault(); cancelEditing() }
            }}
            onBlur={() => { if (editingOptionId === item.id) void saveEditing(item) }}
            className="h-6 min-w-[120px] text-sm border-0 bg-white/60 focus:ring-1"
          />
        ) : (
          <span className="text-sm font-medium">{item.value}</span>
        )}
        {isAdmin && (
        <>
        <button
          type="button"
          onClick={() => startEditing(item)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/50"
        >
          <Pencil className="h-3 w-3 text-gray-500" />
        </button>
        <button
          type="button"
          onClick={() => handleDelete(item.id)}
          disabled={savingOptionId === item.id}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-100"
        >
          <Trash2 className="h-3 w-3 text-red-500" />
        </button>
        </>
        )}
      </div>
    )
  }

  const renderRow = (item: OptionItem, cat: typeof CATEGORIES[number], extra?: ReactNode) => {
    const isEditing = editingOptionId === item.id
    return (
      <div
        key={item.id}
        className={`group flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all ${cat.bg} hover:shadow-sm`}
      >
        {isEditing ? (
          <Input
            autoFocus
            value={editingOptionValue}
            onChange={(e) => setEditingOptionValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); void saveEditing(item) }
              if (e.key === 'Escape') { e.preventDefault(); cancelEditing() }
            }}
            onBlur={() => { if (editingOptionId === item.id) void saveEditing(item) }}
            className="flex-1 h-8"
          />
        ) : (
          <>
            <span className="text-sm font-semibold flex-1">{item.value}</span>
            {extra}
          </>
        )}
        {isAdmin && !isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => startEditing(item)}
              className="p-1 rounded hover:bg-white/60 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5 text-gray-500" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              disabled={savingOptionId === item.id}
              className="p-1 rounded hover:bg-red-100 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </button>
          </div>
        )}
      </div>
    )
  }

  const catConfig = (key: PredefinedCategory) => CATEGORIES.find((c) => c.key === key)!

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-20">
        <div className="mx-auto px-6 lg:px-10 py-4" style={{ maxWidth: '1400px' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </button>
              <div className="h-5 w-px bg-gray-300" />
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <Settings className="h-5 w-5" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Quản trị hệ thống</h1>
              </div>
            </div>
            {/* Tab switcher */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(isAdmin || canAdd) && (
              <button
                onClick={() => setActiveTab('options')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'options' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Settings className="h-3.5 w-3.5" />
                Cài đặt
              </button>
              )}
              {user?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Nhân viên
                {userStats.pending > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                    {userStats.pending}
                  </span>
                )}
              </button>
              )}
              {user?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'orders' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Tất cả đơn
              </button>
              )}
              {(isAdmin || hasTabPerm('reports')) && (
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'reports' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Báo cáo
              </button>
              )}
              {(isAdmin || hasTabPerm('logs')) && (
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'logs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Nhật ký
              </button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-400">Xin chào</p>
                <p className="text-sm font-semibold text-gray-700">{user?.name || 'Người dùng'}</p>
              </div>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name || 'U'} className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 text-gray-500 hover:text-red-600 hover:border-red-200"
              >
                <LogOut className="h-3.5 w-3.5" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto px-6 lg:px-10 py-8" style={{ maxWidth: '1400px' }}>
        {activeTab === 'users' ? (
        /* ===== USER MANAGEMENT TAB — redesigned ===== */
        <div>
          {/* Stats row — 4 cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5 bg-slate-50 border-slate-200">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-slate-100 text-slate-500 shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-medium leading-tight">Tổng nhân viên</p>
                <p className="text-base font-bold text-slate-800 leading-tight">{userStats.total}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5 bg-amber-50 border-amber-200">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-amber-100 text-amber-600 shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-amber-600 font-medium leading-tight">Chờ duyệt</p>
                <p className="text-base font-bold text-amber-700 leading-tight">{userStats.pending}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5 bg-emerald-50 border-emerald-200">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-emerald-100 text-emerald-600 shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-600 font-medium leading-tight">Đã duyệt</p>
                <p className="text-base font-bold text-emerald-700 leading-tight">{userStats.approved}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5 bg-indigo-50 border-indigo-200">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-indigo-100 text-indigo-600 shrink-0">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-indigo-600 font-medium leading-tight">Nhân viên</p>
                <p className="text-base font-bold text-indigo-700 leading-tight">{userStats.staff}</p>
              </div>
            </div>
          </div>

          {/* Search + Filter */}
          <div className="space-y-3 mb-5">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm theo tên, email..."
                value={usersSearch}
                onChange={(e) => setUsersSearch(e.target.value)}
                className="pl-9 h-10 text-sm bg-white border-gray-200 focus:border-blue-400 focus:ring-blue-100"
              />
              {usersSearch && (
                <button
                  onClick={() => setUsersSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Status filter chips */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: '', label: 'Tất cả', color: 'bg-slate-100 text-slate-600 border-slate-200' },
                { value: 'pending', label: 'Chờ duyệt', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                { value: 'approved', label: 'Đã duyệt', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { value: 'rejected', label: 'Từ chối', color: 'bg-red-50 text-red-700 border-red-200' },
              ].map((chip) => (
                <button
                  key={chip.value}
                  onClick={() => setUsersStatusFilter(chip.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    usersStatusFilter === chip.value
                      ? chip.color + ' ring-2 ring-offset-1 ring-current/20 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {chip.value === 'pending' && <Clock className="h-3 w-3" />}
                  {chip.value === 'approved' && <ShieldCheck className="h-3 w-3" />}
                  {chip.value === 'rejected' && <XCircle className="h-3 w-3" />}
                  {chip.label}
                </button>
              ))}

              {/* Live indicator */}
              <div className="flex items-center gap-1.5 ml-auto text-[10px] text-gray-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                </span>
                Live
              </div>
            </div>
          </div>

          {/* Staff list */}
          {usersLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              {usersSearch || usersStatusFilter ? (
                <>
                  <p className="text-gray-400 text-sm mb-3">Không tìm thấy nhân viên phù hợp</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setUsersSearch(''); setUsersStatusFilter('') }}
                  >
                    Xóa bộ lọc
                  </Button>
                </>
              ) : (
                <p className="text-gray-400 text-sm">Chưa có nhân viên nào</p>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredUsers.map((u: any) => {
                const counts = customerCounts[u.id] as any
                const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' })
                const fmtVND = (v: number) => v > 0 ? Number(v).toLocaleString('vi-VN') + 'đ' : '0đ'

                const statusStyle: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
                  pending:  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Chờ duyệt' },
                  approved: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Đã duyệt' },
                  rejected: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', dot: 'bg-red-500', label: 'Từ chối' },
                }
                const st = statusStyle[u.status] || { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', dot: 'bg-gray-500', label: u.status }

                return (
                  <div
                    key={u.id}
                    className={`rounded-xl border ${st.border} overflow-hidden transition-all hover:shadow-md bg-white`}
                  >
                    {/* Card header */}
                    <div className="px-4 py-3 flex items-center gap-3">
                      {/* Avatar */}
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name || u.email} className="h-11 w-11 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className={`flex items-center justify-center h-11 w-11 rounded-xl text-white font-bold text-sm shrink-0 ${
                          u.role === 'admin' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'
                        }`}>
                          {(u.name || u.email)[0].toUpperCase()}
                        </div>
                      )}

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        {/* Row 1: name + badges */}
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-gray-900 truncate">{u.name || 'Chưa đặt tên'}</span>
                          {u.role === 'admin' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                              <Shield className="h-2.5 w-2.5" /> ADMIN
                            </span>
                          )}
                          {u.role === 'staff' && u.canAddOptions && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-600 border border-violet-200">
                              <Settings className="h-2.5 w-2.5" /> Thêm mục
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.bg} ${st.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </div>
                        {/* Row 2: email + date */}
                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                          <span className="truncate">{u.email}</span>
                          <span className="text-gray-300">·</span>
                          <span>Tham gia {fmtDate(u.createdAt)}</span>
                        </div>
                      </div>

                      {/* Right side: quick stats */}
                      {u.status === 'approved' && counts && (
                        <div className="text-right shrink-0 hidden sm:block">
                          <p className="text-sm font-bold text-gray-800">{counts.total} đơn</p>
                          <p className="text-[10px] text-emerald-600 font-medium">{fmtVND(counts.revenue)}</p>
                        </div>
                      )}

                      {/* Actions */}
                      {user?.id === u.id ? (
                        <span className="text-[11px] text-gray-400 italic shrink-0 px-2 py-1 rounded-full bg-gray-50 border border-gray-100">Bạn</span>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {u.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(u.id)}
                                disabled={actionLoading === u.id}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs h-8 px-3"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" /> Duyệt
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(u.id)}
                                disabled={actionLoading === u.id}
                                className="text-red-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50 gap-1 text-xs h-8 px-3"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Từ chối
                              </Button>
                            </>
                          )}
                          {u.status === 'approved' && (
                            <>
                              {u.role === 'staff' && (
                                <select
                                  value={u.role}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value as 'admin' | 'staff')}
                                  disabled={actionLoading === u.id}
                                  className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs focus:ring-2 focus:ring-indigo-300 cursor-pointer"
                                >
                                  <option value="staff">Nhân viên</option>
                                  <option value="admin">Admin</option>
                                </select>
                              )}
                              {u.role === 'staff' && (
                                <button
                                  onClick={() => handleToggleAddOptions(u.id, !u.canAddOptions)}
                                  disabled={actionLoading === u.id}
                                  className={`h-8 rounded-lg border px-3 text-xs font-medium transition-all ${
                                    u.canAddOptions
                                      ? 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 shadow-sm'
                                      : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                                  }`}
                                  title={u.canAddOptions ? 'Thu hồi quyền thêm tùy chọn' : 'Cấp quyền thêm tùy chọn'}
                                >
                                  <span className="flex items-center gap-1.5">
                                    <Settings className="h-3 w-3" />
                                    {u.canAddOptions ? 'Thêm mục ✓' : 'Thêm mục'}
                                  </span>
                                </button>
                              )}
                              {u.role === 'staff' && (
                                <button
                                  onClick={() => openPermDialog(u.id, u.name || u.email, u.permissions)}
                                  disabled={actionLoading === u.id}
                                  className="h-8 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-all"
                                  title="Phân quyền chi tiết"
                                >
                                  <span className="flex items-center gap-1.5">
                                    <KeyRound className="h-3 w-3" />
                                    Phân quyền
                                  </span>
                                </button>
                              )}
                            </>
                          )}
                          {u.status === 'rejected' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(u.id)}
                              disabled={actionLoading === u.id}
                              className="text-emerald-600 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 gap-1 text-xs h-8 px-3"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" /> Duyệt lại
                            </Button>
                          )}
                          {u.role !== 'admin' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteUser(u.id, u.name || u.email)}
                              disabled={actionLoading === u.id}
                              className="text-red-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 h-8 px-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expandable details — order stats + permissions */}
                    {u.status === 'approved' && (
                      <details className="group">
                        <summary className="px-4 py-1.5 bg-gray-50/80 border-t cursor-pointer text-[11px] text-gray-400 hover:text-gray-600 transition-colors list-none flex items-center gap-1">
                          <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                          Xem chi tiết hiệu suất
                        </summary>
                        <div className="px-4 py-3 bg-gray-50/50 border-t">
                          {counts ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                              <div className="rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2">
                                <p className="text-[10px] text-amber-600 font-medium">Chờ sửa</p>
                                <p className="text-lg font-bold text-amber-700">{counts.pending}</p>
                              </div>
                              <div className="rounded-lg border border-purple-100 bg-purple-50/50 px-3 py-2">
                                <p className="text-[10px] text-purple-600 font-medium">Đang sửa</p>
                                <p className="text-lg font-bold text-purple-700">{counts.repairing}</p>
                              </div>
                              <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2">
                                <p className="text-[10px] text-emerald-600 font-medium">Đã xong</p>
                                <p className="text-lg font-bold text-emerald-700">{counts.completed}</p>
                              </div>
                              <div className="rounded-lg border border-sky-100 bg-sky-50/50 px-3 py-2">
                                <p className="text-[10px] text-sky-600 font-medium">Đã trả máy</p>
                                <p className="text-lg font-bold text-sky-700">{counts.returned}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">Chưa có dữ liệu đơn hàng</p>
                          )}
                          {/* Permissions summary */}
                          <div className="flex items-center gap-3 text-xs text-gray-500 pt-2 border-t border-gray-200/60">
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Vai trò: <strong className="text-gray-700">{u.role === 'admin' ? 'Quản trị' : 'Nhân viên'}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                              <Settings className="h-3 w-3" />
                              Thêm mục: <strong className={u.canAddOptions ? 'text-violet-600' : 'text-gray-700'}>{u.canAddOptions ? 'Được phép' : 'Không'}</strong>
                            </span>
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        ) : activeTab === 'orders' ? (
        /* ===== ALL ORDERS TAB (admin only) — redesigned ===== */
        <div>
          {/* Stats row — 6 cards */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5 bg-slate-50 border-slate-200">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-slate-100 text-slate-500 shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-medium leading-tight">Tổng đơn</p>
                <p className="text-base font-bold text-slate-800 leading-tight">{allOrdersStats.totalCustomers}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5 bg-amber-50 border-amber-200">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-amber-100 text-amber-600 shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-amber-600 font-medium leading-tight">Chờ sửa</p>
                <p className="text-base font-bold text-amber-700 leading-tight">{allOrdersStats.pending}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5 bg-purple-50 border-purple-200">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-purple-100 text-purple-600 shrink-0">
                <Wrench className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-purple-600 font-medium leading-tight">Đang sửa</p>
                <p className="text-base font-bold text-purple-700 leading-tight">{allOrdersStats.repairing}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5 bg-emerald-50 border-emerald-200">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-emerald-100 text-emerald-600 shrink-0">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-600 font-medium leading-tight">Đã xong</p>
                <p className="text-base font-bold text-emerald-700 leading-tight">{allOrdersStats.completed}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5 bg-sky-50 border-sky-200">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-sky-100 text-sky-600 shrink-0">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-sky-600 font-medium leading-tight">Đã trả</p>
                <p className="text-base font-bold text-sky-700 leading-tight">{allOrdersStats.returned}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5 bg-emerald-50 border-emerald-200">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-emerald-100 text-emerald-600 shrink-0">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-600 font-medium leading-tight">Doanh thu</p>
                <p className="text-sm font-bold text-emerald-700 leading-tight">{allOrdersStats.totalRevenue > 0 ? Number(allOrdersStats.totalRevenue).toLocaleString('vi-VN') + 'đ' : '0đ'}</p>
              </div>
            </div>
          </div>

          {/* Search + Filters */}
          <div className="space-y-3 mb-5">
            {/* Search bar — instant search with debounce */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm theo tên, SĐT, mã phiếu, thiết bị, người sửa..."
                  value={allOrdersSearch}
                  onChange={(e) => {
                    setAllOrdersSearch(e.target.value)
                    clearTimeout((window as any).__ordersSearchTimer)
                    ;(window as any).__ordersSearchTimer = setTimeout(() => {
                      loadAllOrders(1, e.target.value, allOrdersStatus, allOrdersStaff)
                    }, 300)
                  }}
                  className="pl-9 h-10 text-sm bg-white border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                />
                {allOrdersSearch && (
                  <button
                    onClick={() => { setAllOrdersSearch(''); loadAllOrders(1, '', allOrdersStatus, allOrdersStaff) }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                onClick={() => handleExport('orders')}
                variant="outline"
                size="sm"
                className="h-10 gap-1.5 shrink-0"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Xuất Excel</span>
              </Button>
            </div>

            {/* Status filter chips + Staff filter + Result count */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status chips */}
              {[
                { value: '', label: 'Tất cả', count: allOrdersStats.totalCustomers, color: 'bg-slate-100 text-slate-600 border-slate-200' },
                { value: 'pending', label: 'Chờ sửa', count: allOrdersStats.pending, color: 'bg-amber-50 text-amber-700 border-amber-200' },
                { value: 'repairing', label: 'Đang sửa', count: allOrdersStats.repairing, color: 'bg-purple-50 text-purple-700 border-purple-200' },
                { value: 'completed', label: 'Đã xong', count: allOrdersStats.completed, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { value: 'returned', label: 'Đã trả', count: allOrdersStats.returned, color: 'bg-sky-50 text-sky-700 border-sky-200' },
              ].map((chip) => (
                <button
                  key={chip.value}
                  onClick={() => { setAllOrdersStatus(chip.value); loadAllOrders(1, allOrdersSearch, chip.value, allOrdersStaff) }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    allOrdersStatus === chip.value
                      ? chip.color + ' ring-2 ring-offset-1 ring-current/20 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {chip.value === 'pending' && <Clock className="h-3 w-3" />}
                  {chip.value === 'repairing' && <Wrench className="h-3 w-3" />}
                  {chip.value === 'completed' && <ClipboardCheck className="h-3 w-3" />}
                  {chip.value === 'returned' && <UserCheck className="h-3 w-3" />}
                  {chip.label}
                  <span className={`ml-0.5 text-[10px] ${allOrdersStatus === chip.value ? 'opacity-70' : 'opacity-40'}`}>{chip.count}</span>
                </button>
              ))}

              <div className="h-5 w-px bg-gray-200 mx-1" />

              {/* Staff filter */}
              <select
                value={allOrdersStaff}
                onChange={(e) => { setAllOrdersStaff(e.target.value); loadAllOrders(1, allOrdersSearch, allOrdersStatus, e.target.value) }}
                className="h-8 rounded-full border border-gray-200 px-3 text-xs bg-white hover:bg-gray-50 cursor-pointer"
              >
                <option value="">Tất cả nhân viên</option>
                {userList.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>

              {/* Active filters summary + clear */}
              {(allOrdersSearch || allOrdersStatus || allOrdersStaff) && (
                <button
                  onClick={() => { setAllOrdersSearch(''); setAllOrdersStatus(''); setAllOrdersStaff(''); loadAllOrders(1, '', '', '') }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] text-red-500 hover:bg-red-50 transition-colors"
                >
                  <XCircle className="h-3 w-3" /> Xóa lọc
                </button>
              )}

              {/* Result count + Live indicator */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[11px] text-gray-400">{allOrdersTotal} kết quả</span>
                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                  </span>
                  Live
                </span>
              </div>
            </div>
          </div>

          {/* Orders list */}
          {allOrdersLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : allOrders.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              {allOrdersSearch || allOrdersStatus || allOrdersStaff ? (
                <>
                  <p className="text-gray-400 text-sm mb-3">Không tìm thấy đơn hàng phù hợp</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setAllOrdersSearch(''); setAllOrdersStatus(''); setAllOrdersStaff(''); loadAllOrders(1, '', '', '') }}
                  >
                    Xóa bộ lọc
                  </Button>
                </>
              ) : (
                <p className="text-gray-400 text-sm">Chưa có đơn hàng nào</p>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {allOrders.map((order: any) => {
                const statusConfig: Record<string, { label: string; bg: string; border: string; text: string; dot: string; icon: typeof Clock }> = {
                  pending:    { label: 'Chờ sửa',   bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-500',   icon: Clock },
                  repairing:  { label: 'Đang sửa',  bg: 'bg-purple-50',  border: 'border-purple-200',  text: 'text-purple-700',  dot: 'bg-purple-500',  icon: Wrench },
                  completed:  { label: 'Đã xong',   bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: ClipboardCheck },
                  returned:   { label: 'Đã trả',    bg: 'bg-sky-50',     border: 'border-sky-200',     text: 'text-sky-700',     dot: 'bg-sky-500',     icon: UserCheck },
                }
                const s = statusConfig[order.status] || { label: order.status, bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', dot: 'bg-gray-500', icon: FileText }
                const StatusIcon = s.icon
                const cost = order.repairCost ? Number(order.repairCost) : 0
                const formatVND = (v: number) => v > 0 ? v.toLocaleString('vi-VN') + 'đ' : '—'
                const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'
                const fmtDateTime = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'

                return (
                  <div
                    key={order.id}
                    className={`rounded-xl border ${s.border} overflow-hidden transition-all hover:shadow-md bg-white`}
                  >
                    {/* Card header — always visible, compact */}
                    <div className="px-4 py-3 flex items-center gap-3">
                      {/* Status dot */}
                      <div className={`flex items-center justify-center h-10 w-10 rounded-xl ${s.bg} ${s.text} shrink-0`}>
                        <StatusIcon className="h-5 w-5" />
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        {/* Row 1: ticket + status badge + cost + edit */}
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs font-bold text-blue-600">#{order.ticketId}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.bg} ${s.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                            {s.label}
                          </span>
                          <span className="ml-auto text-sm font-bold text-emerald-600">{formatVND(cost)}</span>
                          <button
                            onClick={() => { setAdminEditingCustomer(order); setAdminFormOpen(true) }}
                            className="ml-1 p-1 rounded-md hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {/* Row 2: customer + phone */}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-semibold text-gray-800 truncate">{order.customerName}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-gray-500">{order.phone}</span>
                        </div>
                        {/* Row 3: device + staff + date */}
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1 truncate">
                            <Smartphone className="h-3 w-3 shrink-0" />
                            {order.deviceType}{order.deviceModel ? ` — ${order.deviceModel}` : ''}
                          </span>
                          {order.staffName && (
                            <span className="flex items-center gap-1 shrink-0">
                              <Users className="h-3 w-3" />
                              {order.staffName}
                            </span>
                          )}
                          <span className="ml-auto shrink-0">{fmtDate(order.receivedDate)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expandable details — richer layout */}
                    <details className="group">
                      <summary className="px-4 py-1.5 bg-gray-50/80 border-t cursor-pointer text-[11px] text-gray-400 hover:text-gray-600 transition-colors list-none flex items-center gap-1">
                        <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                        Xem chi tiết sửa chữa
                      </summary>
                      <div className="px-4 py-3 bg-gray-50/50 border-t">
                        {/* Two-column detail grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                          {/* Left column: Device + Condition */}
                          <div className="space-y-2">
                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Thiết bị</p>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Hiệu máy</span>
                                  <span className="text-gray-800 font-medium">{order.deviceType}</span>
                                </div>
                                {order.deviceModel && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Model</span>
                                    <span className="text-gray-800 font-medium">{order.deviceModel}</span>
                                  </div>
                                )}
                                {order.accessories && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Phụ kiện</span>
                                    <span className="text-gray-800 font-medium text-right max-w-[60%]">{order.accessories}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Tình trạng</p>
                              <div className="space-y-1 text-xs">
                                {order.conditionBefore && (
                                  <div>
                                    <span className="text-gray-500">Trước sửa:</span>{' '}
                                    <span className="text-red-600 font-medium">{order.conditionBefore}</span>
                                  </div>
                                )}
                                {order.conditionAfter && (
                                  <div>
                                    <span className="text-gray-500">Sau sửa:</span>{' '}
                                    <span className="text-emerald-600 font-medium">{order.conditionAfter}</span>
                                  </div>
                                )}
                                {!order.conditionBefore && !order.conditionAfter && (
                                  <span className="text-gray-400 italic">Chưa ghi nhận</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right column: Staff + Dates + Cost */}
                          <div className="space-y-2">
                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Nhân viên</p>
                              <div className="space-y-1 text-xs">
                                {order.receivedBy && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Người nhận máy</span>
                                    <span className="text-gray-800 font-medium">{order.receivedBy}</span>
                                  </div>
                                )}
                                {order.repairedBy && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Người sửa máy</span>
                                    <span className="text-gray-800 font-medium">{order.repairedBy}</span>
                                  </div>
                                )}
                                {order.staffName && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Người tạo đơn</span>
                                    <span className="text-gray-800 font-medium">{order.staffName}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Thời gian</p>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Ngày nhận</span>
                                  <span className="text-gray-800 font-medium">{fmtDateTime(order.receivedDate)}</span>
                                </div>
                                {order.returnedDate && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Ngày trả</span>
                                    <span className="text-gray-800 font-medium">{fmtDateTime(order.returnedDate)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Tạo đơn</span>
                                  <span className="text-gray-800 font-medium">{fmtDateTime(order.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Chi phí</p>
                              <div className="text-sm font-bold text-emerald-600">{formatVND(cost)}</div>
                            </div>
                          </div>
                        </div>

                        {/* Notes — full width */}
                        {order.notes && (
                          <div className="mt-3 pt-3 border-t border-gray-200/60">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Ghi chú</p>
                            <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{order.notes}</p>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {allOrdersPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <Button
                variant="outline"
                size="sm"
                disabled={allOrdersPage <= 1 || allOrdersLoading}
                onClick={() => loadAllOrders(allOrdersPage - 1)}
                className="h-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-500 px-2">
                {allOrdersPage} / {allOrdersPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={allOrdersPage >= allOrdersPages || allOrdersLoading}
                onClick={() => loadAllOrders(allOrdersPage + 1)}
                className="h-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        ) : activeTab === 'reports' ? (
        /* ===== REPORTS TAB ===== */
        <div>
          {reportsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Export buttons */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Button onClick={() => handleExport('orders')} variant="outline" size="sm" className="gap-1.5">
                  <Download className="h-4 w-4" /> Xuất đơn hàng
                </Button>
                <Button onClick={() => handleExport('revenue')} variant="outline" size="sm" className="gap-1.5">
                  <Download className="h-4 w-4" /> Xuất doanh thu
                </Button>
                <Button onClick={() => handleExport('staff')} variant="outline" size="sm" className="gap-1.5">
                  <Download className="h-4 w-4" /> Xuất hiệu suất NV
                </Button>
                <div className="flex-1" />
                <select
                  value={reportYear}
                  onChange={(e) => { setReportYear(Number(e.target.value)); loadReports() }}
                  className="h-9 rounded-md border border-gray-200 px-3 text-sm bg-white"
                >
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Revenue chart */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Doanh thu theo tháng {reportYear}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {revenueData.map((m: any) => {
                      const maxRevenue = Math.max(...revenueData.map((r: any) => r.revenue), 1)
                      const pct = (m.revenue / maxRevenue) * 100
                      return (
                        <div key={m.month} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-16 shrink-0">{m.monthLabel}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.max(pct, 1)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 w-20 text-right shrink-0">
                            {m.revenue > 0 ? m.revenue.toLocaleString('vi-VN') + 'đ' : '—'}
                          </span>
                          <span className="text-[10px] text-gray-400 w-12 text-right shrink-0">{m.totalOrders} đơn</span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Stats row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Completion rate */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5 text-green-600" />
                      Tỷ lệ hoàn thành
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="relative h-24 w-24">
                        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#22c55e" strokeWidth="3"
                            strokeDasharray={`${completionRate.completionRate} ${100 - completionRate.completionRate}`}
                            strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-green-700">
                          {completionRate.completionRate}%
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Chờ sửa: <b>{completionRate.pending}</b></div>
                        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-purple-400" /> Đang sửa: <b>{completionRate.repairing}</b></div>
                        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-green-400" /> Đã xong: <b>{completionRate.completed}</b></div>
                        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-400" /> Đã trả: <b>{completionRate.returned}</b></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Device stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Cpu className="h-5 w-5 text-purple-600" />
                      Thiết bị sửa nhiều nhất
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {deviceStats.slice(0, 6).map((d: any) => {
                        const maxCount = Math.max(...deviceStats.map((x: any) => x.count), 1)
                        const pct = (d.count / maxCount) * 100
                        return (
                          <div key={d.deviceType} className="flex items-center gap-3">
                            <span className="text-xs text-gray-600 w-24 truncate shrink-0">{d.deviceType}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                              <div className="bg-gradient-to-r from-purple-400 to-purple-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 w-8 text-right shrink-0">{d.count}</span>
                          </div>
                        )
                      })}
                      {deviceStats.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Chưa có dữ liệu</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Staff performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-600" />
                    Hiệu suất nhân viên
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          <th className="text-left px-4 py-3 font-medium text-gray-500">Nhân viên</th>
                          <th className="text-center px-4 py-3 font-medium text-gray-500">Tổng đơn</th>
                          <th className="text-center px-4 py-3 font-medium text-gray-500">Chờ sửa</th>
                          <th className="text-center px-4 py-3 font-medium text-gray-500">Đang sửa</th>
                          <th className="text-center px-4 py-3 font-medium text-gray-500">Đã xong</th>
                          <th className="text-center px-4 py-3 font-medium text-gray-500">Đã trả</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-500">Doanh thu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffPerf.map((s: any) => (
                          <tr key={s.userId} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="px-4 py-3 font-medium">{s.staffName}</td>
                            <td className="px-4 py-3 text-center font-semibold">{s.totalOrders}</td>
                            <td className="px-4 py-3 text-center"><span className="text-amber-600">{s.pending}</span></td>
                            <td className="px-4 py-3 text-center"><span className="text-purple-600">{s.repairing}</span></td>
                            <td className="px-4 py-3 text-center"><span className="text-green-600">{s.completed}</span></td>
                            <td className="px-4 py-3 text-center"><span className="text-blue-600">{s.returned}</span></td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                              {s.revenue > 0 ? s.revenue.toLocaleString('vi-VN') + 'đ' : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {staffPerf.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Chưa có dữ liệu</p>}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
        ) : activeTab === 'logs' ? (
        /* ===== ACTIVITY LOG TAB — redesigned ===== */
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Nhật ký hoạt động</h2>
              <p className="text-xs text-gray-400 mt-0.5">Theo dõi mọi thao tác trong hệ thống</p>
            </div>
            <div className="flex items-center gap-3">
              {logsTotal > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirmDialog({ open: true, title: 'Xóa tất cả nhật ký', description: 'Bạn có chắc muốn xóa toàn bộ nhật ký hoạt động? Hành động này không thể hoàn tác.', onConfirm: handleDeleteAllLogs })}
                  className="h-8 text-xs gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa tất cả
                </Button>
              )}
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Live
              </span>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Tổng hoạt động', value: logsTotal, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Đơn hàng', value: logs.filter((l: any) => l.action?.includes('order')).length, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Nhân viên', value: logs.filter((l: any) => l.action?.includes('user') || l.action === 'change_role' || l.action === 'toggle_permission').length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Tùy chọn', value: logs.filter((l: any) => l.action?.includes('option')).length, icon: Settings, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map((s, i) => (
              <div key={i} className={`rounded-xl border px-4 py-3 ${s.bg} border-gray-100`}>
                <div className="flex items-center gap-2">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                  <span className="text-xl font-bold text-gray-800">{s.value}</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <Filter className="h-3.5 w-3.5" />
              Bộ lọc
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Action filter */}
              <select
                value={logsActionFilter}
                onChange={(e) => { setLogsActionFilter(e.target.value); loadLogs(1, e.target.value, logsUserFilter, logsDateFrom, logsDateTo) }}
                className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
              >
                <option value="">Tất cả hoạt động</option>
                <optgroup label="Đơn hàng">
                  <option value="create_order">Tạo đơn</option>
                  <option value="update_order">Sửa đơn</option>
                  <option value="delete_order">Xóa đơn</option>
                </optgroup>
                <optgroup label="Nhân viên">
                  <option value="approve_user">Duyệt nhân viên</option>
                  <option value="reject_user">Từ chối NV</option>
                  <option value="delete_user">Xóa nhân viên</option>
                  <option value="change_role">Đổi vai trò</option>
                  <option value="toggle_permission">Cấp/thu hồi quyền</option>
                </optgroup>
                <optgroup label="Tùy chọn">
                  <option value="add_option">Thêm tùy chọn</option>
                  <option value="update_option">Sửa tùy chọn</option>
                  <option value="delete_option">Xóa tùy chọn</option>
                </optgroup>
                <optgroup label="Báo cáo">
                  <option value="export_report">Xuất báo cáo</option>
                  <option value="export_excel">Xuất Excel</option>
                </optgroup>
              </select>

              {/* User filter */}
              <select
                value={logsUserFilter}
                onChange={(e) => { setLogsUserFilter(e.target.value); loadLogs(1, logsActionFilter, e.target.value, logsDateFrom, logsDateTo) }}
                className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
              >
                <option value="">Tất cả nhân viên</option>
                {userList.filter((u: any) => u.status === 'approved').map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>

              {/* Date from */}
              <input
                type="date"
                value={logsDateFrom}
                onChange={(e) => { setLogsDateFrom(e.target.value); loadLogs(1, logsActionFilter, logsUserFilter, e.target.value, logsDateTo) }}
                className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                placeholder="Từ ngày"
              />

              {/* Date to */}
              <input
                type="date"
                value={logsDateTo}
                onChange={(e) => { setLogsDateTo(e.target.value); loadLogs(1, logsActionFilter, logsUserFilter, logsDateFrom, e.target.value) }}
                className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                placeholder="Đến ngày"
              />
            </div>

            {/* Active filters */}
            {(logsActionFilter || logsUserFilter || logsDateFrom || logsDateTo) && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-gray-400">Lọc theo:</span>
                {logsActionFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium">
                    {logsActionFilter}
                    <button onClick={() => { setLogsActionFilter(''); loadLogs(1, '', logsUserFilter, logsDateFrom, logsDateTo) }} className="hover:text-blue-900">×</button>
                  </span>
                )}
                {logsUserFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-medium">
                    {userList.find((u: any) => u.id === logsUserFilter)?.name || logsUserFilter}
                    <button onClick={() => { setLogsUserFilter(''); loadLogs(1, logsActionFilter, '', logsDateFrom, logsDateTo) }} className="hover:text-purple-900">×</button>
                  </span>
                )}
                {logsDateFrom && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium">
                    Từ {logsDateFrom}
                    <button onClick={() => { setLogsDateFrom(''); loadLogs(1, logsActionFilter, logsUserFilter, '', logsDateTo) }} className="hover:text-amber-900">×</button>
                  </span>
                )}
                {logsDateTo && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium">
                    Đến {logsDateTo}
                    <button onClick={() => { setLogsDateTo(''); loadLogs(1, logsActionFilter, logsUserFilter, logsDateFrom, '') }} className="hover:text-amber-900">×</button>
                  </span>
                )}
                <button
                  onClick={() => { setLogsActionFilter(''); setLogsUserFilter(''); setLogsDateFrom(''); setLogsDateTo(''); loadLogs(1, '', '', '', '') }}
                  className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                >
                  Xóa tất cả
                </button>
              </div>
            )}
          </div>

          {/* Timeline */}
          {logsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              {logsActionFilter || logsUserFilter || logsDateFrom || logsDateTo ? (
                <>
                  <Search className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm mb-2">Không tìm thấy hoạt động phù hợp</p>
                  <Button variant="outline" size="sm" onClick={() => { setLogsActionFilter(''); setLogsUserFilter(''); setLogsDateFrom(''); setLogsDateTo(''); loadLogs(1, '', '', '', '') }}>
                    Xóa bộ lọc
                  </Button>
                </>
              ) : (
                <>
                  <Activity className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Chưa có hoạt động nào</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Group logs by date */}
              {(() => {
                const groups: Record<string, any[]> = {}
                logs.forEach((log: any) => {
                  const date = new Date(log.createdAt).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                  if (!groups[date]) groups[date] = []
                  groups[date].push(log)
                })

                const actionConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
                  create_order:    { label: 'Tạo đơn hàng',      color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', icon: FilePlus },
                  update_order:    { label: 'Sửa đơn hàng',      color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200',    icon: Pencil },
                  delete_order:    { label: 'Xóa đơn hàng',       color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200',     icon: Trash2 },
                  approve_user:    { label: 'Duyệt nhân viên',    color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', icon: UserCheck },
                  reject_user:     { label: 'Từ chối nhân viên',  color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200',     icon: UserX },
                  delete_user:     { label: 'Xóa nhân viên',     color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200',     icon: UserMinus },
                  add_option:      { label: 'Thêm tùy chọn',     color: 'text-indigo-700',  bg: 'bg-indigo-50',   border: 'border-indigo-200',  icon: Plus },
                  update_option:   { label: 'Sửa tùy chọn',      color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200',    icon: Pencil },
                  delete_option:   { label: 'Xóa tùy chọn',      color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200',     icon: Trash2 },
                  change_role:     { label: 'Đổi vai trò',       color: 'text-purple-700',  bg: 'bg-purple-50',   border: 'border-purple-200',  icon: Shield },
                  toggle_permission: { label: 'Cấp/thu hồi quyền', color: 'text-amber-700', bg: 'bg-amber-50',    border: 'border-amber-200',  icon: KeyRound },
                  export_report:   { label: 'Xuất báo cáo',      color: 'text-teal-700',    bg: 'bg-teal-50',     border: 'border-teal-200',    icon: Download },
                  export_excel:    { label: 'Xuất Excel',        color: 'text-teal-700',    bg: 'bg-teal-50',     border: 'border-teal-200',    icon: Download },
                }

                return Object.entries(groups).map(([date, items]) => (
                  <div key={date}>
                    {/* Date header */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-px flex-1 bg-gray-100" />
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-1 bg-gray-50 rounded-full">{date}</span>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>

                    {/* Log items */}
                    <div className="space-y-2">
                      {items.map((log: any) => {
                        const cfg = actionConfig[log.action] || { label: log.action, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200', icon: Activity }
                        const Icon = cfg.icon
                        const time = new Date(log.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        return (
                          <div key={log.id} className={`flex items-start gap-3 rounded-xl border ${cfg.border} ${cfg.bg} p-3 hover:shadow-sm transition-shadow`}>
                            {/* Icon */}
                            <div className={`flex items-center justify-center h-9 w-9 rounded-lg ${cfg.bg} ${cfg.color} shrink-0 border ${cfg.border}`}>
                              <Icon className="h-4 w-4" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                                <span className="text-[11px] text-gray-400">•</span>
                                <span className="text-[11px] text-gray-400">{time}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-600 font-medium">{log.userName || 'Hệ thống'}</span>
                                {log.target && (
                                  <>
                                    <span className="text-[10px] text-gray-300">→</span>
                                    <span className="text-xs text-gray-500 truncate max-w-[200px]">{log.target}</span>
                                  </>
                                )}
                              </div>
                              {log.details && (
                                <p className="text-[11px] text-gray-400 mt-1 truncate">{log.details}</p>
                              )}
                            </div>

                            {/* Time badge */}
                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-gray-400 font-mono">{time}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}

          {/* Pagination */}
          {logsPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-400">Trang {logsPage} / {logsPages} • {logsTotal} hoạt động</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={logsPage <= 1 || logsLoading} onClick={() => loadLogs(logsPage - 1, logsActionFilter, logsUserFilter, logsDateFrom, logsDateTo)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={logsPage >= logsPages || logsLoading} onClick={() => loadLogs(logsPage + 1, logsActionFilter, logsUserFilter, logsDateFrom, logsDateTo)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        ) : (
        <>
        {/* ===== OPTIONS TAB (existing content) ===== */}
        {!isAdmin && !canAdd ? (
          user ? (
          <div className="text-center py-20">
            <Shield className="h-16 w-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 text-sm mb-2">Bạn không có quyền truy cập trang này</p>
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
              Quay lại Dashboard
            </Button>
          </div>
          ) : (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
          )
        ) : null}

        {isAdmin || canAdd ? (
        <>
        {/* Summary bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          {visibleCategories.map((cat) => {
            const count = getOptionsByCategory(cat.key).length
            const Icon = cat.icon
            return (
              <div
                key={cat.key}
                className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 ${cat.bg} ${cat.border}`}
              >
                <Icon className={`h-4 w-4 ${cat.color}`} />
                <div>
                  <p className="text-lg font-bold text-gray-800">{count}</p>
                  <p className="text-[10px] text-gray-500 leading-tight">{cat.label}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Section 1: Thiết bị (Hiệu máy + Model) */}
        {(hasCategoryPerm('deviceType') || hasCategoryPerm('deviceModel')) && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 px-1">Thiết bị</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hiệu máy */}
            {hasCategoryPerm('deviceType') && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-blue-100">
                    <Smartphone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Hiệu máy</CardTitle>
                    <CardDescription>Danh sách các hãng thiết bị</CardDescription>
                  </div>
                </div>
                <CardAction>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${catConfig('deviceType').badge}`}>
                    {deviceTypes.length}
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent>
                {canAdd && (
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Thêm hiệu máy mới..."
                    value={newValues.deviceType}
                    onChange={(e) => setNewValues((prev) => ({ ...prev, deviceType: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAdd('deviceType') }}
                    disabled={adding === 'deviceType'}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleAdd('deviceType')}
                    disabled={adding === 'deviceType' || !newValues.deviceType.trim()}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm
                  </Button>
                </div>
                )}

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full" />
                  </div>
                ) : deviceTypes.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Chưa có hiệu máy nào</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                    {deviceTypes.map((item) => {
                      const modelCount = options.filter(
                        (o) => o.category === 'deviceModel' && o.parentValue === item.value
                      ).length
                      return renderRow(item, catConfig('deviceType'),
                        modelCount > 0 ? (
                          <span className="text-xs text-gray-400 bg-white/60 rounded-full px-2 py-0.5">{modelCount} model</span>
                        ) : null
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Model máy */}
            {hasCategoryPerm('deviceModel') && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-purple-100">
                    <Cpu className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>Model máy</CardTitle>
                    <CardDescription>Model theo từng hiệu máy</CardDescription>
                  </div>
                </div>
                <CardAction>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${catConfig('deviceModel').badge}`}>
                    {getOptionsByCategory('deviceModel').length}
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-white px-3 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none transition-all"
                  >
                    <option value="">-- Chọn hiệu máy --</option>
                    {deviceTypes.map((dt) => (
                      <option key={dt.id} value={dt.value}>{dt.value}</option>
                    ))}
                  </select>
                  {canAdd && (
                  <div className="flex gap-2">
                    <Input
                      placeholder={selectedBrand ? `Thêm model cho ${selectedBrand}...` : 'Chọn hiệu máy trước...'}
                      value={newValues.deviceModel}
                      onChange={(e) => setNewValues((prev) => ({ ...prev, deviceModel: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAdd('deviceModel', selectedBrand) }}
                      disabled={adding === 'deviceModel' || !selectedBrand}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => handleAdd('deviceModel', selectedBrand)}
                      disabled={adding === 'deviceModel' || !newValues.deviceModel.trim() || !selectedBrand}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white shrink-0 gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Thêm
                    </Button>
                  </div>
                  )}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-6 w-6 border-3 border-purple-500 border-t-transparent rounded-full" />
                  </div>
                ) : getOptionsByCategory('deviceModel').length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Cpu className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Chưa có model nào</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {Object.entries(getModelsGroupedByBrand()).map(([brand, models]) => {
                      const isExpanded = expandedBrands.has(brand)
                      return (
                        <div key={brand} className="rounded-xl border border-purple-100 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleBrand(brand)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 transition-colors text-left"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-purple-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-purple-400" />
                            )}
                            <span className="text-sm font-semibold text-purple-700">{brand}</span>
                            <span className="text-xs text-purple-400 ml-auto">{models.length} model</span>
                          </button>
                          {isExpanded && (
                            <div className="p-2 space-y-1 bg-white">
                              {models.map((item) => renderRow(item, catConfig('deviceModel')))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            )}
          </div>
        </div>
        )}

        {/* Section 2: Phụ kiện & Tình trạng */}
        {(hasCategoryPerm('accessories') || hasCategoryPerm('conditionBefore') || hasCategoryPerm('conditionAfter')) && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 px-1">Phụ kiện & Tình trạng</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Phụ kiện */}
            {hasCategoryPerm('accessories') && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-orange-100">
                    <Cable className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle>Phụ kiện</CardTitle>
                    <CardDescription>Danh sách phụ kiện đi kèm</CardDescription>
                  </div>
                </div>
                <CardAction>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${catConfig('accessories').badge}`}>
                    {getOptionsByCategory('accessories').length}
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent>
                {canAdd && (
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Thêm phụ kiện..."
                    value={newValues.accessories}
                    onChange={(e) => setNewValues((prev) => ({ ...prev, accessories: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAdd('accessories') }}
                    disabled={adding === 'accessories'}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleAdd('accessories')}
                    disabled={adding === 'accessories' || !newValues.accessories.trim()}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 text-white shrink-0 gap-1"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                )}

                {loading ? (
                  <div className="flex justify-center py-6"><div className="animate-spin h-6 w-6 border-3 border-orange-500 border-t-transparent rounded-full" /></div>
                ) : getOptionsByCategory('accessories').length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Chưa có phụ kiện nào</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {getOptionsByCategory('accessories').map((item) => renderPill(item, catConfig('accessories')))}
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Tình trạng trước sửa */}
            {hasCategoryPerm('conditionBefore') && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-red-100">
                    <ClipboardList className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle>Trước sửa</CardTitle>
                    <CardDescription>Tình trạng khi nhận máy</CardDescription>
                  </div>
                </div>
                <CardAction>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${catConfig('conditionBefore').badge}`}>
                    {getOptionsByCategory('conditionBefore').length}
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent>
                {canAdd && (
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Thêm tình trạng..."
                    value={newValues.conditionBefore}
                    onChange={(e) => setNewValues((prev) => ({ ...prev, conditionBefore: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAdd('conditionBefore') }}
                    disabled={adding === 'conditionBefore'}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleAdd('conditionBefore')}
                    disabled={adding === 'conditionBefore' || !newValues.conditionBefore.trim()}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white shrink-0 gap-1"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                )}

                {loading ? (
                  <div className="flex justify-center py-6"><div className="animate-spin h-6 w-6 border-3 border-red-500 border-t-transparent rounded-full" /></div>
                ) : getOptionsByCategory('conditionBefore').length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Chưa có mục nào</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {getOptionsByCategory('conditionBefore').map((item) => renderPill(item, catConfig('conditionBefore')))}
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Tình trạng sau sửa */}
            {hasCategoryPerm('conditionAfter') && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-100">
                    <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle>Sau sửa</CardTitle>
                    <CardDescription>Tình trạng khi trả máy</CardDescription>
                  </div>
                </div>
                <CardAction>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${catConfig('conditionAfter').badge}`}>
                    {getOptionsByCategory('conditionAfter').length}
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent>
                {canAdd && (
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Thêm tình trạng..."
                    value={newValues.conditionAfter}
                    onChange={(e) => setNewValues((prev) => ({ ...prev, conditionAfter: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAdd('conditionAfter') }}
                    disabled={adding === 'conditionAfter'}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleAdd('conditionAfter')}
                    disabled={adding === 'conditionAfter' || !newValues.conditionAfter.trim()}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-1"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                )}

                {loading ? (
                  <div className="flex justify-center py-6"><div className="animate-spin h-6 w-6 border-3 border-emerald-500 border-t-transparent rounded-full" /></div>
                ) : getOptionsByCategory('conditionAfter').length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Chưa có mục nào</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {getOptionsByCategory('conditionAfter').map((item) => renderPill(item, catConfig('conditionAfter')))}
                  </div>
                )}
              </CardContent>
            </Card>
            )}
          </div>
        </div>
        )}

        {/* Section 3: Nhân sự */}
        {(hasCategoryPerm('receivedBy') || hasCategoryPerm('repairedBy')) && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 px-1">Nhân sự</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Người nhận máy */}
            {hasCategoryPerm('receivedBy') && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-teal-100">
                    <UserCheck className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <CardTitle>Người nhận máy</CardTitle>
                    <CardDescription>Nhân viên tiếp nhận</CardDescription>
                  </div>
                </div>
                <CardAction>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${catConfig('receivedBy').badge}`}>
                    {getOptionsByCategory('receivedBy').length}
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent>
                {canAdd && (
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Thêm tên người nhận..."
                    value={newValues.receivedBy}
                    onChange={(e) => setNewValues((prev) => ({ ...prev, receivedBy: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAdd('receivedBy') }}
                    disabled={adding === 'receivedBy'}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleAdd('receivedBy')}
                    disabled={adding === 'receivedBy' || !newValues.receivedBy.trim()}
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 text-white shrink-0 gap-1"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                )}

                {loading ? (
                  <div className="flex justify-center py-6"><div className="animate-spin h-6 w-6 border-3 border-teal-500 border-t-transparent rounded-full" /></div>
                ) : getOptionsByCategory('receivedBy').length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Chưa có người nào</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {getOptionsByCategory('receivedBy').map((item) => renderPill(item, catConfig('receivedBy')))}
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Người sửa máy */}
            {hasCategoryPerm('repairedBy') && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-100">
                    <Wrench className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle>Người sửa máy</CardTitle>
                    <CardDescription>Kỹ thuật viên sửa chữa</CardDescription>
                  </div>
                </div>
                <CardAction>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${catConfig('repairedBy').badge}`}>
                    {getOptionsByCategory('repairedBy').length}
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent>
                {canAdd && (
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Thêm tên người sửa..."
                    value={newValues.repairedBy}
                    onChange={(e) => setNewValues((prev) => ({ ...prev, repairedBy: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAdd('repairedBy') }}
                    disabled={adding === 'repairedBy'}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleAdd('repairedBy')}
                    disabled={adding === 'repairedBy' || !newValues.repairedBy.trim()}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 gap-1"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                )}

                {loading ? (
                  <div className="flex justify-center py-6"><div className="animate-spin h-6 w-6 border-3 border-indigo-500 border-t-transparent rounded-full" /></div>
                ) : getOptionsByCategory('repairedBy').length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Chưa có người nào</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {getOptionsByCategory('repairedBy').map((item) => renderPill(item, catConfig('repairedBy')))}
                  </div>
                )}
              </CardContent>
            </Card>
            )}
          </div>
        </div>
        )}
        </>
        ) : null}
        </>
        )}
      </main>

      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">{confirmDialog.description}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>Hủy</Button>
            <Button variant="destructive" onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(prev => ({ ...prev, open: false })) }}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-600" />
              Phân quyền: {permDialogUserName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Category permissions */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Danh mục sử dụng</p>
              <div className="space-y-2">
                {[
                  { key: 'deviceType' as const, label: 'Hiệu máy', group: 'Thiết bị' },
                  { key: 'deviceModel' as const, label: 'Model máy', group: 'Thiết bị' },
                  { key: 'accessories' as const, label: 'Phụ kiện', group: 'Phụ kiện & Tình trạng' },
                  { key: 'conditionBefore' as const, label: 'Tình trạng trước sửa', group: 'Phụ kiện & Tình trạng' },
                  { key: 'conditionAfter' as const, label: 'Tình trạng sau sửa', group: 'Phụ kiện & Tình trạng' },
                  { key: 'receivedBy' as const, label: 'Người nhận máy', group: 'Nhân sự' },
                  { key: 'repairedBy' as const, label: 'Người sửa máy', group: 'Nhân sự' },
                ].reduce((groups, item) => {
                  const existing = groups.find(g => g.label === item.group)
                  if (existing) existing.items.push(item)
                  else groups.push({ label: item.group, items: [item] })
                  return groups
                }, [] as { label: string; items: { key: keyof StaffPermissions['categories']; label: string; group: string }[] }[]).map((group) => (
                  <div key={group.label}>
                    <p className="text-[11px] font-medium text-gray-500 mb-1.5">{group.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <button
                          key={item.key}
                          onClick={() => setPermDialogPerms(prev => ({
                            ...prev,
                            categories: { ...prev.categories, [item.key]: !prev.categories[item.key] }
                          }))}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            permDialogPerms.categories[item.key]
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                              : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${permDialogPerms.categories[item.key] ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tab permissions */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tab truy cập thêm</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'reports' as const, label: 'Báo cáo', icon: BarChart3 },
                  { key: 'logs' as const, label: 'Nhật ký', icon: Activity },
                ].map((tab) => {
                  const TabIcon = tab.icon
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setPermDialogPerms(prev => ({
                        ...prev,
                        tabs: { ...prev.tabs, [tab.key]: !prev.tabs[tab.key] }
                      }))}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        permDialogPerms.tabs[tab.key]
                          ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                          : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      <TabIcon className="h-3 w-3" />
                      <span className={`h-1.5 w-1.5 rounded-full ${permDialogPerms.tabs[tab.key] ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPermDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSavePermissions} disabled={actionLoading === permDialogUserId} className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
              {actionLoading === permDialogUserId ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Lưu quyền
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin edit customer form */}
      <CustomerForm
        open={adminFormOpen}
        onOpenChange={setAdminFormOpen}
        customer={adminEditingCustomer}
        onSuccess={loadAllOrders}
      />

      {/* Delete user dialog with 2 options */}
      <Dialog open={deleteUserDialog.open} onOpenChange={(open) => setDeleteUserDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash className="h-4 w-4 text-red-500" />
              Xóa nhân viên
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">
              Xóa tài khoản <span className="font-semibold">"{deleteUserDialog.userName}"</span>?
            </p>
            {deleteUserDialog.orderCount > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Nhân viên này có <span className="font-bold">{deleteUserDialog.orderCount}</span> đơn hàng trong hệ thống.
              </p>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              className="w-full justify-center"
              onClick={handleDeleteUserOnly}
              disabled={actionLoading === deleteUserDialog.userId}
            >
              {actionLoading === deleteUserDialog.userId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Chỉ xóa tài khoản (giữ đơn hàng)
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-center"
              onClick={handleDeleteUserAndOrders}
              disabled={actionLoading === deleteUserDialog.userId}
            >
              {actionLoading === deleteUserDialog.userId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Xóa tất cả (bao gồm {deleteUserDialog.orderCount} đơn hàng)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

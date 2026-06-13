'use client'

import { type ChangeEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Download, X } from 'lucide-react'

interface SearchFilterProps {
  searchTerm: string
  onSearch: (query: string) => void
  onClearFilters?: () => void
  onExport: () => void | Promise<void>
  onStatusFilter: (status: string) => void
  currentStatus: string
  dateFrom: string
  dateTo: string
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  staffName?: string
  staffOptions?: string[]
  onStaffNameChange?: (value: string) => void
  showStaffFilter?: boolean
}

export function SearchFilter({
  searchTerm,
  onSearch,
  onClearFilters,
  onExport,
  onStatusFilter,
  currentStatus,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  staffName = '',
  staffOptions = [],
  onStaffNameChange,
  showStaffFilter = false,
}: SearchFilterProps) {
  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value)
  }

  const clearSearch = () => {
    onSearch('')
  }

  const hasFilters = Boolean(searchTerm.trim() || currentStatus || dateFrom || dateTo || staffName)

  const clearFilters = () => {
    if (onClearFilters) {
      onClearFilters()
      return
    }

    onSearch('')
    onStatusFilter('')
    onDateFromChange('')
    onDateToChange('')
    onStaffNameChange?.('')
  }

  return (
    <div className="flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
        <Input
          placeholder="Tìm tên, SĐT, mã phiếu..."
          value={searchTerm}
          onChange={handleSearch}
          className="pl-9 pr-8 h-9 text-sm border-slate-200 focus-visible:border-blue-400 focus-visible:ring-blue-400/20"
          aria-label="Tìm kiếm khách hàng"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Xóa tìm kiếm"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Status filter */}
      <select
        value={currentStatus}
        onChange={(e) => onStatusFilter(e.target.value)}
        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition-colors outline-none hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 cursor-pointer"
      >
        <option value="">Tất cả trạng thái</option>
        <option value="pending">Chờ sửa</option>
        <option value="repairing">Đang sửa</option>
        <option value="completed">Đã xong</option>
        <option value="returned">Đã trả máy</option>
      </select>

      {showStaffFilter && (
        <select
          value={staffName}
          onChange={(e) => onStaffNameChange?.(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition-colors outline-none hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 cursor-pointer min-w-[180px]"
          aria-label="Lọc theo nhân viên"
        >
          <option value="">Tất cả nhân viên</option>
          {staffOptions.map((staff) => (
            <option key={staff} value={staff}>
              {staff}
            </option>
          ))}
        </select>
      )}

      {/* Date range */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="h-9 w-[130px] text-sm border-slate-200 focus-visible:border-blue-400 focus-visible:ring-blue-400/20"
            aria-label="Từ ngày"
          />
          <span className="text-xs text-slate-400">→</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="h-9 w-[130px] text-sm border-slate-200 focus-visible:border-blue-400 focus-visible:ring-blue-400/20"
            aria-label="Đến ngày"
          />
        </div>
        {dateFrom && dateTo && dateFrom > dateTo && (
          <p className="text-xs font-medium text-amber-600">Ngày bắt đầu không được sau ngày kết thúc.</p>
        )}
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <Button
          onClick={clearFilters}
          variant="ghost"
          size="sm"
          className="h-9 text-slate-500 hover:text-slate-700 gap-1"
        >
          <X className="h-3.5 w-3.5" />
          Xóa lọc
        </Button>
      )}

      {/* Export */}
      <Button
        onClick={onExport}
        variant="outline"
        size="sm"
        className="flex items-center gap-1.5 h-9 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 whitespace-nowrap"
      >
        <Download className="h-3.5 w-3.5" />
        Xuất Excel
      </Button>
    </div>
  )
}

'use client'

import { useState, type ChangeEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Download, X } from 'lucide-react'

interface SearchFilterProps {
  onSearch: (query: string) => void
  onExport: () => void
  onStatusFilter: (status: string) => void
  currentStatus: string
  dateFrom: string
  dateTo: string
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
}

export function SearchFilter({
  onSearch,
  onExport,
  onStatusFilter,
  currentStatus,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: SearchFilterProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    onSearch(e.target.value)
  }

  const clearSearch = () => {
    setSearchTerm('')
    onSearch('')
  }

  const hasFilters = currentStatus || dateFrom || dateTo

  const clearFilters = () => {
    onStatusFilter('')
    onDateFromChange('')
    onDateToChange('')
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
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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

      {/* Date range */}
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

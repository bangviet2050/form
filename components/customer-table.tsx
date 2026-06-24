'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { deleteCustomer, updateCustomer } from '@/app/actions/customers'
import { getOptions, type PredefinedCategory } from '@/app/actions/options'
import { toast } from 'sonner'
import { CustomerHistoryDialog } from '@/components/customer-history-dialog'
import type { Customer } from '@/lib/types'
import { getStatusLabel, getStatusColor, formatVietnamDateTime, toVietnamDate, toVietnamTime } from '@/lib/utils'
import { Trash2, Edit, FileText, FileCheck2, History, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Clock } from 'lucide-react'

interface CustomerTableProps {
  customers: Customer[]
  hasFilters: boolean
  onEdit: (customer: Customer) => void
  onRefresh: () => void
  onCustomersUpdate: (customers: Customer[]) => void
  onStatsRefresh: () => void
  onPrint: (customer: Customer) => void
  onPrintXacNhan: (customer: Customer) => void
  onViewStatusHistory: (customer: Customer) => void
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  selectedIds: Set<number>
  onSelect: (ids: Set<number>) => void
}

type SortField =
  | 'customerName'
  | 'phone'
  | 'deviceType'
  | 'deviceModel'
  | 'repairCost'
  | 'receivedDate'
  | 'returnedDate'
  | 'status'

export function CustomerTable({
  customers,
  hasFilters,
  onEdit,
  onRefresh,
  onCustomersUpdate,
  onStatsRefresh,
  onPrint,
  onPrintXacNhan,
  onViewStatusHistory,
  page,
  totalPages,
  onPageChange,
  selectedIds: selectedIdsProp,
  onSelect: onSelectProp,
}: CustomerTableProps) {
  const [deleting, setDeleting] = useState<number | null>(null)
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<number>>(new Set())
  const selectedIds = onSelectProp !== undefined ? selectedIdsProp : localSelectedIds
  const setSelectedIds = onSelectProp !== undefined ? onSelectProp : setLocalSelectedIds
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [pageInput, setPageInput] = useState('')
  const [historyCustomer, setHistoryCustomer] = useState<{ name: string; phone: string } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: React.ReactNode; onConfirm: () => void }>({ open: false, title: '', description: '', onConfirm: () => {} })
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)
  const selectAllRef = useRef<HTMLInputElement>(null)
  const [inlineSuggestOpen, setInlineSuggestOpen] = useState(false)
  const [inlineHighlightIdx, setInlineHighlightIdx] = useState(-1)
  const [suggestPos, setSuggestPos] = useState<{ top: number; left: number; width: number; upward: boolean } | null>(null)

  const calcSuggestPos = (rect: DOMRect) => {
    const dropdownHeight = 160
    const spaceBelow = window.innerHeight - rect.bottom
    const upward = spaceBelow < dropdownHeight && rect.top > dropdownHeight
    setSuggestPos({
      top: upward ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      upward,
    })
  }
  const userTypingRef = useRef(false)
  const ignoreBlurRef = useRef(false)

  const [suggestions, setSuggestions] = useState<Record<PredefinedCategory, string[]>>({
    deviceType: [],
    deviceModel: [],
    accessories: [],
    conditionBefore: [],
    conditionAfter: [],
    receivedBy: [],
    repairedBy: [],
  })
  const [modelWithParent, setModelWithParent] = useState<{ value: string; parentValue: string | null }[]>([])

  useEffect(() => {
    getOptions().then((data) => {
      if (!Array.isArray(data)) return
      const grouped: Record<PredefinedCategory, string[]> = { deviceType: [], deviceModel: [], accessories: [], conditionBefore: [], conditionAfter: [], receivedBy: [], repairedBy: [] }
      const models: { value: string; parentValue: string | null }[] = []
      for (const item of data as { category: string; value: string; parentValue: string | null }[]) {
        if (item.category === 'deviceType') grouped.deviceType.push(item.value)
        else if (item.category === 'accessories') grouped.accessories.push(item.value)
        else if (item.category === 'conditionBefore') grouped.conditionBefore.push(item.value)
        else if (item.category === 'conditionAfter') grouped.conditionAfter.push(item.value)
        else if (item.category === 'receivedBy') grouped.receivedBy.push(item.value)
        else if (item.category === 'repairedBy') grouped.repairedBy.push(item.value)
        else if (item.category === 'deviceModel') {
          grouped.deviceModel.push(item.value)
          models.push({ value: item.value, parentValue: item.parentValue })
        }
      }
      setSuggestions(grouped)
      setModelWithParent(models)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select()
      }
      // Calculate position for fixed suggestion dropdown
      const rect = inputRef.current.getBoundingClientRect()
      calcSuggestPos(rect)
    }
  }, [editingCell])

  useEffect(() => {
    setPageInput('')
  }, [page])

  // Update suggestion position on scroll/resize
  useEffect(() => {
    if (!inlineSuggestOpen || !inputRef.current) return
    const update = () => {
      const rect = inputRef.current?.getBoundingClientRect()
      if (rect) calcSuggestPos(rect)
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [inlineSuggestOpen])

  // Fixed-position suggestion dropdown rendered via portal to body
  const renderSuggestDropdown = (items: string[]) => {
    if (!inlineSuggestOpen || items.length === 0 || !suggestPos) return null
    const posStyle: React.CSSProperties = suggestPos.upward
      ? { position: 'fixed', bottom: window.innerHeight - suggestPos.top, left: suggestPos.left, width: suggestPos.width, zIndex: 9999 }
      : { position: 'fixed', top: suggestPos.top, left: suggestPos.left, width: suggestPos.width, zIndex: 9999 }
    return createPortal(
      <div
        style={posStyle}
        className="flex flex-col max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
      >
        {items.map((s, i) => (
          <button
            key={s}
            type="button"
            className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
              i === inlineHighlightIdx ? 'bg-blue-100 text-blue-700' : 'hover:bg-blue-50 hover:text-blue-700'
            }`}
            onMouseDown={(e) => {
              e.preventDefault()
              ignoreBlurRef.current = true
              setInlineSuggestOpen(false)
              setInlineHighlightIdx(-1)
              saveEdit(s)
            }}
            onMouseEnter={() => setInlineHighlightIdx(i)}
          >
            {s}
          </button>
        ))}
      </div>,
      document.body
    )
  }

  const selectedCustomers = customers.filter((customer) => selectedIds.has(customer.id))
  const visibleSelectedCount = selectedCustomers.length
  const allVisibleSelected = customers.length > 0 && visibleSelectedCount === customers.length
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected
    }
  }, [someVisibleSelected])

  const getSortValue = (customer: Customer, field: SortField): string | number => {
    switch (field) {
      case 'customerName': return customer.customerName
      case 'phone': return customer.phone
      case 'deviceType': return customer.deviceType
      case 'deviceModel': return customer.deviceModel || ''
      case 'repairCost': return customer.repairCost == null ? '' : Number(customer.repairCost)
      case 'receivedDate': return new Date(customer.receivedDate).getTime()
      case 'returnedDate': return customer.returnedDate ? new Date(customer.returnedDate).getTime() : ''
      case 'status': return customer.status
      default: return ''
    }
  }

  const sortedCustomers = useMemo(() => {
    if (!sortField) return customers
    return [...customers].sort((a, b) => {
      const aValue = getSortValue(a, sortField)
      const bValue = getSortValue(b, sortField)
      const aEmpty = aValue === '' || aValue === null || Number.isNaN(aValue)
      const bEmpty = bValue === '' || bValue === null || Number.isNaN(bValue)

      if (aEmpty && bEmpty) return 0
      if (aEmpty) return 1
      if (bEmpty) return -1

      let comparison = 0
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue), 'vi', { numeric: true, sensitivity: 'base' })
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [customers, sortDirection, sortField])

  const clearSelection = () => setSelectedIds(new Set())

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection('asc')
  }

  const toggleRowSelection = (id: number) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    const next = new Set(selectedIds)
    if (allVisibleSelected) {
      customers.forEach((customer) => next.delete(customer.id))
    } else {
      customers.forEach((customer) => next.add(customer.id))
    }
    setSelectedIds(next)
  }

  const startEdit = (id: number, field: string, value: string) => {
    setEditingCell({ id, field })
    setEditValue(value)
    const hasSuggestions = ['receivedBy', 'repairedBy', 'deviceType', 'accessories', 'deviceModel'].includes(field)
    setInlineSuggestOpen(hasSuggestions)
    setInlineHighlightIdx(-1)
    userTypingRef.current = false
    ignoreBlurRef.current = false
  }

  const saveEdit = async (overrideValue?: string | React.FocusEvent) => {
    if (!editingCell) return
    const { id, field } = editingCell
    const valueToSave = typeof overrideValue === 'string' ? overrideValue : editValue

    const data: Record<string, unknown> = {}

    if (field === 'repairCost') {
      data[field] = valueToSave || null
    } else if (field === 'receivedDate') {
      data[field] = valueToSave ? valueToSave + ':00+07:00' : undefined
    } else if (field === 'returnedDate') {
      data[field] = valueToSave ? valueToSave + ':00+07:00' : null
    } else {
      data[field] = valueToSave
    }

    setEditingCell(null)
    setEditValue('')
    setInlineSuggestOpen(false)
    setInlineHighlightIdx(-1)
    setSuggestPos(null)

    const oldCustomers = customers
    const updatedCustomers = customers.map((c) => {
      if (c.id !== id) return c
      return { ...c, ...data } as Customer
    })
    onCustomersUpdate(updatedCustomers)

    try {
      await updateCustomer(id, data)
      toast.success('Đã cập nhật!')
      onRefresh()
      onStatsRefresh()
    } catch (error) {
      onCustomersUpdate(oldCustomers)
      toast.error('Lỗi cập nhật: ' + (error instanceof Error ? error.message : 'Không xác định'))
    }
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
    setInlineSuggestOpen(false)
    setInlineHighlightIdx(-1)
    setSuggestPos(null)
  }

  const handleReturnNow = async (customer: Customer) => {
    const now = new Date()
    const dateStr = `${toVietnamDate(now)}T${toVietnamTime(now)}:00+07:00`

    const oldCustomers = customers
    onCustomersUpdate(customers.map((c) =>
      c.id === customer.id ? { ...c, returnedDate: new Date(dateStr) as unknown as Date, status: 'returned' as const } : c
    ))

    try {
      await updateCustomer(customer.id, { returnedDate: dateStr, status: 'returned' })
      toast.success('Đã trả máy!')
      onRefresh()
      onStatsRefresh()
    } catch (error) {
      onCustomersUpdate(oldCustomers)
      toast.error('Lỗi cập nhật: ' + (error instanceof Error ? error.message : 'Không xác định'))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit() }
    if (e.key === 'Escape') cancelEdit()
  }

  const handleDelete = async (id: number) => {
    setDeleting(id)
    const oldCustomers = customers
    const oldSelectedIds = new Set(selectedIds)

    onCustomersUpdate(customers.filter((c) => c.id !== id))
    if (selectedIds.has(id)) {
      const next = new Set(selectedIds)
      next.delete(id)
      setSelectedIds(next)
    }

    try {
      await deleteCustomer(id)
      toast.success('Đã xóa khách hàng!')
      onRefresh()
      onStatsRefresh()
    } catch (error: unknown) {
      onCustomersUpdate(oldCustomers)
      setSelectedIds(oldSelectedIds)
      toast.error('Lỗi xóa khách hàng: ' + (error instanceof Error ? error.message : 'Không xác định'))
    } finally {
      setDeleting(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    setBulkActionLoading(true)
    const count = selectedIds.size
    const oldCustomers = customers
    const idsToDelete = new Set(selectedIds)

    onCustomersUpdate(customers.filter((c) => !idsToDelete.has(c.id)))
    clearSelection()

    try {
      await Promise.all([...idsToDelete].map((id) => deleteCustomer(id)))
      toast.success(`Đã xóa ${count} khách hàng!`)
      onRefresh()
      onStatsRefresh()
    } catch (error) {
      onCustomersUpdate(oldCustomers)
      toast.error('Lỗi xóa khách hàng: ' + (error instanceof Error ? error.message : 'Không xác định'))
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkStatusChange = async (status: Customer['status']) => {
    if (selectedIds.size === 0) return

    setBulkActionLoading(true)
    const oldCustomers = customers
    const idsToChange = new Set(selectedIds)
    const now = new Date()
    const returnedDate = toVietnamDate(now)
    const returnedTime = toVietnamTime(now)

    const updates = status === 'returned'
      ? { status, returnedDate: new Date(`${returnedDate}T${returnedTime}:00+07:00`) }
      : { status }

    onCustomersUpdate(customers.map((c) =>
      idsToChange.has(c.id) ? { ...c, ...updates } as Customer : c
    ))
    clearSelection()

    try {
      await Promise.all([...idsToChange].map((id) => updateCustomer(id, status === 'returned'
        ? { status, returnedDate, returnedTime }
        : { status }
      )))
      toast.success('Đã đổi trạng thái!')
      onRefresh()
      onStatsRefresh()
    } catch (error) {
      onCustomersUpdate(oldCustomers)
      toast.error('Lỗi đổi trạng thái: ' + (error instanceof Error ? error.message : 'Không xác định'))
    } finally {
      setBulkActionLoading(false)
    }
  }

  const getRawValue = (customer: Customer, field: string): string => {
    switch (field) {
      case 'customerName': return customer.customerName
      case 'phone': return customer.phone
      case 'deviceType': return customer.deviceType
      case 'deviceModel': return customer.deviceModel || ''
      case 'accessories': return customer.accessories || ''
      case 'receivedBy': return customer.receivedBy || ''
      case 'repairedBy': return customer.repairedBy || ''
      case 'repairCost': return customer.repairCost ? String(customer.repairCost) : ''
      case 'status': return customer.status
      case 'receivedDate': {
        const d = new Date(customer.receivedDate)
        return `${toVietnamDate(d)}T${toVietnamTime(d)}`
      }
      case 'returnedDate': {
        if (!customer.returnedDate) return ''
        const d = new Date(customer.returnedDate)
        return `${toVietnamDate(d)}T${toVietnamTime(d)}`
      }
      default: return ''
    }
  }

  const handleGoToPage = () => {
    const nextPage = Number(pageInput)
    if (!Number.isInteger(nextPage) || nextPage < 1 || nextPage > totalPages) {
      return
    }
    onPageChange(nextPage)
  }

  const renderCell = (customer: Customer, field: string, displayContent: React.ReactNode) => {
    const isEditing = editingCell?.id === customer.id && editingCell?.field === field

    if (isEditing) {
      const inputClass = 'w-full h-8 rounded-md border border-blue-400 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white shadow-sm'

      if (field === 'status') {
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            className={inputClass}
          >
            <option value="pending">Chờ sửa</option>
            <option value="repairing">Đang sửa</option>
            <option value="completed">Đã xong</option>
            <option value="returned">Đã trả máy</option>
          </select>
        )
      }

      if (field === 'receivedDate' || field === 'returnedDate') {
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="datetime-local"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            className={inputClass}
          />
        )
      }

      // receivedBy & repairedBy: free text input with suggestion dropdown
      if (field === 'receivedBy' || field === 'repairedBy') {
        const fieldSuggestions = suggestions[field as keyof typeof suggestions] || []
        const lowerValue = editValue.toLowerCase()
        const filteredSuggestions = userTypingRef.current
          ? fieldSuggestions.filter((s) => s.toLowerCase().includes(lowerValue))
          : fieldSuggestions

        return (
          <div className="relative">
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value)
                setInlineSuggestOpen(true)
                setInlineHighlightIdx(-1)
                userTypingRef.current = true
              }}
              onFocus={() => setInlineSuggestOpen(true)}
              onBlur={() => {
                if (ignoreBlurRef.current) { ignoreBlurRef.current = false; return }
                setInlineSuggestOpen(false)
                setInlineHighlightIdx(-1)
                saveEdit()
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  if (filteredSuggestions.length > 0) {
                    setInlineSuggestOpen(true)
                    setInlineHighlightIdx((prev) => {
                      if (prev < 0) return 0
                      return Math.min(prev + 1, filteredSuggestions.length - 1)
                    })
                  }
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  if (filteredSuggestions.length > 0) {
                    setInlineSuggestOpen(true)
                    setInlineHighlightIdx((prev) => Math.max(0, prev - 1))
                  }
                } else if (e.key === 'Enter') {
                  if (inlineSuggestOpen && inlineHighlightIdx >= 0 && inlineHighlightIdx < filteredSuggestions.length) {
                    e.preventDefault()
                    setInlineSuggestOpen(false)
                    saveEdit(filteredSuggestions[inlineHighlightIdx])
                  } else {
                    e.preventDefault()
                    saveEdit()
                  }
                } else if (e.key === 'Escape') {
                  cancelEdit()
                }
              }}
              className={inputClass}
              autoComplete="off"
            />
            {renderSuggestDropdown(filteredSuggestions)}
          </div>
        )
      }

      // deviceType & accessories: free text input with suggestion dropdown
      if (field === 'deviceType' || field === 'accessories') {
        const fieldSuggestions = suggestions[field as keyof typeof suggestions] || []
        const lowerValue = editValue.toLowerCase()
        const filteredSuggestions = userTypingRef.current
          ? fieldSuggestions.filter((s) => s.toLowerCase().includes(lowerValue))
          : fieldSuggestions

        return (
          <div className="relative">
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value)
                setInlineSuggestOpen(true)
                setInlineHighlightIdx(-1)
                userTypingRef.current = true
              }}
              onFocus={() => setInlineSuggestOpen(true)}
              onBlur={() => {
                if (ignoreBlurRef.current) { ignoreBlurRef.current = false; return }
                setInlineSuggestOpen(false)
                setInlineHighlightIdx(-1)
                saveEdit()
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  if (filteredSuggestions.length > 0) {
                    setInlineSuggestOpen(true)
                    setInlineHighlightIdx((prev) => {
                      if (prev < 0) return 0
                      return Math.min(prev + 1, filteredSuggestions.length - 1)
                    })
                  }
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  if (filteredSuggestions.length > 0) {
                    setInlineSuggestOpen(true)
                    setInlineHighlightIdx((prev) => Math.max(0, prev - 1))
                  }
                } else if (e.key === 'Enter') {
                  if (inlineSuggestOpen && inlineHighlightIdx >= 0 && inlineHighlightIdx < filteredSuggestions.length) {
                    e.preventDefault()
                    setInlineSuggestOpen(false)
                    saveEdit(filteredSuggestions[inlineHighlightIdx])
                  } else {
                    e.preventDefault()
                    saveEdit()
                  }
                } else if (e.key === 'Escape') {
                  cancelEdit()
                }
              }}
              className={inputClass}
              autoComplete="off"
            />
            {renderSuggestDropdown(filteredSuggestions)}
          </div>
        )
      }

      // deviceModel: free text input with suggestion dropdown (filtered by deviceType)
      if (field === 'deviceModel') {
        const filteredModels = customer.deviceType
          ? modelWithParent.filter((m) => m.parentValue === customer.deviceType).map((m) => m.value)
          : suggestions.deviceModel
        const lowerValue = editValue.toLowerCase()
        const filteredSuggestions = userTypingRef.current
          ? filteredModels.filter((s) => s.toLowerCase().includes(lowerValue))
          : filteredModels

        return (
          <div className="relative">
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value)
                setInlineSuggestOpen(true)
                setInlineHighlightIdx(-1)
                userTypingRef.current = true
              }}
              onFocus={() => setInlineSuggestOpen(true)}
              onBlur={() => {
                if (ignoreBlurRef.current) { ignoreBlurRef.current = false; return }
                setInlineSuggestOpen(false)
                setInlineHighlightIdx(-1)
                saveEdit()
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  if (filteredSuggestions.length > 0) {
                    setInlineSuggestOpen(true)
                    setInlineHighlightIdx((prev) => {
                      if (prev < 0) return 0
                      return Math.min(prev + 1, filteredSuggestions.length - 1)
                    })
                  }
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  if (filteredSuggestions.length > 0) {
                    setInlineSuggestOpen(true)
                    setInlineHighlightIdx((prev) => Math.max(0, prev - 1))
                  }
                } else if (e.key === 'Enter') {
                  if (inlineSuggestOpen && inlineHighlightIdx >= 0 && inlineHighlightIdx < filteredSuggestions.length) {
                    e.preventDefault()
                    setInlineSuggestOpen(false)
                    saveEdit(filteredSuggestions[inlineHighlightIdx])
                  } else {
                    e.preventDefault()
                    saveEdit()
                  }
                } else if (e.key === 'Escape') {
                  cancelEdit()
                }
              }}
              className={inputClass}
              autoComplete="off"
            />
            {renderSuggestDropdown(filteredSuggestions)}
          </div>
        )
      }

      return (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={field === 'repairCost' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          className={inputClass}
        />
      )
    }

    if (field === 'returnedDate') {
      return (
        <div
          className="rounded-md px-1.5 -mx-1.5 hover:bg-emerald-50 transition-colors min-h-[28px] flex items-center cursor-pointer"
          onDoubleClick={() => handleReturnNow(customer)}
          title="Nhấp đúp để trả máy"
        >
          {displayContent}
        </div>
      )
    }

    return (
      <div
        className="rounded-md px-1.5 -mx-1.5 hover:bg-blue-50/60 transition-colors min-h-[28px] flex items-center cursor-pointer"
        onDoubleClick={() => startEdit(customer.id, field, getRawValue(customer, field))}
        title="Nhấp đúp để sửa"
      >
        {displayContent}
      </div>
    )
  }

  const renderSortableHeader = (label: string, field: SortField) => (
    <button
      type="button"
      onClick={() => toggleSort(field)}
      className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left font-semibold cursor-pointer transition-colors hover:bg-gray-200 hover:text-blue-600"
    >
      <span>{label}</span>
      {sortField === field ? (
        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-500" /> : <ArrowDown className="h-3 w-3 text-blue-500" />
      ) : (
        <ArrowUpDown className="h-3 w-3 text-gray-300" />
      )}
    </button>
  )

  if (customers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
        <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700">
          {hasFilters
            ? 'Không tìm thấy kết quả. Thử bỏ bộ lọc hoặc thay đổi từ khóa tìm kiếm.'
            : 'Chưa có đơn hàng nào. Nhấn "Thêm khách hàng" để tạo đơn hàng đầu tiên.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-100">
            <TableRow className="border-b border-gray-200 hover:bg-gray-100">
              <TableHead className="w-10 py-2.5">
                <input
                  type="checkbox"
                  ref={selectAllRef}
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  aria-label="Chọn tất cả khách hàng"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </TableHead>
              <TableHead className="py-2.5 font-semibold">Mã phiếu</TableHead>
              <TableHead className="py-2.5 font-semibold">{renderSortableHeader('Tên khách hàng', 'customerName')}</TableHead>
              <TableHead className="py-2.5 font-semibold">{renderSortableHeader('SĐT', 'phone')}</TableHead>
              <TableHead className="py-2.5 font-semibold">{renderSortableHeader('Ngày nhận', 'receivedDate')}</TableHead>
              <TableHead className="py-2.5 font-semibold">Người nhận</TableHead>
              <TableHead className="py-2.5 font-semibold">{renderSortableHeader('Hiệu máy', 'deviceType')}</TableHead>
              <TableHead className="py-2.5 font-semibold">{renderSortableHeader('Model', 'deviceModel')}</TableHead>
              <TableHead className="py-2.5 font-semibold">Phụ kiện</TableHead>
              <TableHead className="py-2.5 font-semibold">{renderSortableHeader('Giá sửa', 'repairCost')}</TableHead>
              <TableHead className="py-2.5 font-semibold">Người sửa</TableHead>
              <TableHead className="py-2.5 font-semibold">{renderSortableHeader('Trạng thái', 'status')}</TableHead>
              <TableHead className="py-2.5 font-semibold">{renderSortableHeader('Ngày trả', 'returnedDate')}</TableHead>
              <TableHead className="py-2.5 font-semibold text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCustomers.map((customer) => (
              <TableRow
                key={customer.id}
                className={`border-b border-gray-100 transition-colors ${selectedIds.has(customer.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <TableCell className="py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(customer.id)}
                    onChange={() => toggleRowSelection(customer.id)}
                    aria-label={`Chọn khách hàng ${customer.customerName}`}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </TableCell>
                <TableCell className="py-2 font-semibold text-blue-600 whitespace-nowrap">
                  {customer.ticketId}
                </TableCell>
                <TableCell className="py-2">
                  <div className={`max-w-[160px] text-ellipsis whitespace-nowrap ${editingCell?.field === 'customerName' ? 'overflow-visible' : 'overflow-hidden'}`} title={customer.customerName}>
                    {renderCell(customer, 'customerName', customer.customerName)}
                  </div>
                </TableCell>
                <TableCell className="py-2 whitespace-nowrap">
                  {renderCell(customer, 'phone', customer.phone)}
                </TableCell>
                <TableCell className="py-2 whitespace-nowrap">
                  {renderCell(customer, 'receivedDate', formatVietnamDateTime(customer.receivedDate))}
                </TableCell>
                <TableCell className="py-2 whitespace-nowrap">
                  {renderCell(customer, 'receivedBy', customer.receivedBy || '-')}
                </TableCell>
                <TableCell className="py-2">
                  <div className={`max-w-[100px] text-ellipsis whitespace-nowrap ${editingCell?.field === 'deviceType' ? 'overflow-visible' : 'overflow-hidden'}`} title={customer.deviceType}>
                    {renderCell(customer, 'deviceType', customer.deviceType)}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className={`max-w-[120px] text-ellipsis whitespace-nowrap ${editingCell?.field === 'deviceModel' ? 'overflow-visible' : 'overflow-hidden'}`} title={customer.deviceModel || ''}>
                    {renderCell(customer, 'deviceModel', customer.deviceModel || '-')}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className={`max-w-[120px] text-ellipsis whitespace-nowrap ${editingCell?.field === 'accessories' ? 'overflow-visible' : 'overflow-hidden'}`} title={customer.accessories || ''}>
                    {renderCell(customer, 'accessories', customer.accessories || '-')}
                  </div>
                </TableCell>
                <TableCell className="py-2 whitespace-nowrap">
                  {renderCell(customer, 'repairCost',
                    customer.repairCost
                      ? `${Number(customer.repairCost).toLocaleString('vi-VN')}đ`
                      : '-'
                  )}
                </TableCell>
                <TableCell className="py-2 whitespace-nowrap">
                  {renderCell(customer, 'repairedBy', customer.repairedBy || '-')}
                </TableCell>
                <TableCell className="py-2 whitespace-nowrap">
                  {renderCell(customer, 'status',
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(customer.status)}`}>
                      {getStatusLabel(customer.status)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-2 whitespace-nowrap">
                  {renderCell(customer, 'returnedDate', formatVietnamDateTime(customer.returnedDate))}
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(customer)}
                      title="Chỉnh sửa"
                      aria-label="Chỉnh sửa"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPrint(customer)}
                      title="In phiếu"
                      aria-label="In phiếu"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPrintXacNhan(customer)}
                      title="Phiếu tiếp nhận"
                      aria-label="Phiếu tiếp nhận"
                    >
                      <FileCheck2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setHistoryCustomer({ name: customer.customerName, phone: customer.phone })}
                      title="Lịch sử sửa máy"
                      aria-label="Lịch sử"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewStatusHistory(customer)}
                      title="Lịch sử trạng thái"
                      aria-label="Lịch sử trạng thái"
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirmDialog({ open: true, title: 'Xóa đơn hàng', description: 'Bạn có chắc muốn xóa đơn hàng này? Hành động này không thể hoàn tác.', onConfirm: () => { handleDelete(customer.id) } })}
                      disabled={deleting === customer.id || bulkActionLoading}
                      title="Xóa"
                      aria-label="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 mt-4 px-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          Trang {page} / {totalPages}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="h-8 w-8 p-0"
              aria-label="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | string)[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                typeof p === 'string' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-sm text-gray-400">...</span>
                ) : (
                  <Button
                    key={p}
                    size="sm"
                    variant={p === page ? 'default' : 'outline'}
                    onClick={() => onPageChange(p)}
                    className={`h-8 w-8 p-0 text-sm ${
                      p === page ? 'bg-blue-600 text-white hover:bg-blue-700' : ''
                    }`}
                  >
                    {p}
                  </Button>
                )
              )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="h-8 w-8 p-0"
              aria-label="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
            <span className="text-sm text-gray-500">Đi đến</span>
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleGoToPage()
                }
              }}
              className="h-8 w-20 bg-white text-sm"
              aria-label="Đi đến trang"
            />
            <Button size="sm" variant="outline" className="h-8" onClick={handleGoToPage}>
              Go
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 rounded-xl border border-gray-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-gray-700">
              {selectedIds.size} khách hàng đã chọn
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => setConfirmDialog({ open: true, title: 'Xóa khách hàng đã chọn', description: `Bạn có chắc muốn xóa ${selectedIds.size} khách hàng đã chọn? Hành động này không thể hoàn tác.`, onConfirm: () => { handleBulkDelete() } })}
                disabled={bulkActionLoading}
              >
                Xóa đã chọn
              </Button>
              <Select
                defaultValue=""
                onChange={async (e) => {
                  const value = e.target.value as Customer['status']
                  if (!value) return
                  e.currentTarget.value = ''
                  await handleBulkStatusChange(value)
                }}
                disabled={bulkActionLoading}
                className="h-9 w-40 bg-white"
                aria-label="Đổi trạng thái các khách hàng đã chọn"
              >
                <option value="" disabled>
                  Đổi trạng thái
                </option>
                <option value="pending">Chờ sửa</option>
                <option value="repairing">Đang sửa</option>
                <option value="completed">Đã xong</option>
                <option value="returned">Đã trả máy</option>
              </Select>
            </div>
          </div>
        </div>
      )}

      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-gray-600">{confirmDialog.description}</div>
            {confirmDialog.title === 'Xóa khách hàng đã chọn' && selectedCustomers.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Danh sách ticket</p>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-gray-700">
                  {selectedCustomers.map((customer) => (
                    <li key={customer.id} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 shadow-sm">
                      <span className="font-medium text-gray-900">{customer.ticketId}</span>
                      <span className="truncate text-gray-500">{customer.customerName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>Hủy</Button>
            <Button variant="destructive" onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(prev => ({ ...prev, open: false })) }}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerHistoryDialog
        open={!!historyCustomer}
        onOpenChange={(open) => { if (!open) setHistoryCustomer(null) }}
        customerName={historyCustomer?.name || ''}
        phone={historyCustomer?.phone || ''}
      />
    </div>
  )
}

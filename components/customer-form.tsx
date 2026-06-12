'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { SuggestInput } from '@/components/suggest-input'
import { VietnamDateSelect } from '@/components/vietnam-date-select'
import { SuggestTextarea } from '@/components/suggest-textarea'
import { createCustomer, updateCustomer, getExistingCustomers } from '@/app/actions/customers'
import { getOptions, type PredefinedCategory } from '@/app/actions/options'
import type { Customer } from '@/lib/types'
import { getStatusLabel, getStatusColor, toVietnamDate, toVietnamTime } from '@/lib/utils'
import { detectCarrier, isValidVietnamPhone } from '@/lib/carrier'
import {
  User,
  Monitor,
  Wrench,
  FileText,
  Loader2,
  CalendarCheck,
} from 'lucide-react'

interface CustomerFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
  onSuccess?: () => void
}

function formatVND(num: number): string {
  return num.toLocaleString('vi-VN')
}

function getCostSuffixLabel(actual: number): string {
  if (actual >= 1_000_000) return '(triệu)'
  if (actual >= 1_000) return '(ngàn)'
  return ''
}

const selectClass =
  'flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-400 hover:border-gray-300 cursor-pointer'

export function CustomerForm({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: CustomerFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewContent, setViewContent] = useState<{ field: string; label: string } | null>(null)
  const [suggestions, setSuggestions] = useState<Record<PredefinedCategory, string[]>>({
    deviceType: [],
    deviceModel: [],
    accessories: [],
    conditionBefore: [],
    conditionAfter: [],
    receivedBy: [],
    repairedBy: [],
  })
  const [modelOptions, setModelOptions] = useState<{ value: string; parentValue: string | null }[]>([])
  const [existingCustomers, setExistingCustomers] = useState<{ customerName: string; phone: string }[]>([])
  const [formData, setFormData] = useState({
    customerName: customer?.customerName || '',
    phone: customer?.phone || '',
    receivedDate: customer?.receivedDate ? toVietnamDate(new Date(customer.receivedDate)) : toVietnamDate(new Date()),
    receivedTime: customer?.receivedDate ? toVietnamTime(new Date(customer.receivedDate)) : toVietnamTime(new Date()),
    deviceType: customer?.deviceType || '',
    deviceModel: customer?.deviceModel || '',
    accessories: customer?.accessories || '',
    conditionBefore: customer?.conditionBefore || '',
    conditionAfter: customer?.conditionAfter || '',
    receivedBy: customer?.receivedBy || '',
    repairedBy: customer?.repairedBy || '',
    repairCost: customer?.repairCost || '',
    notes: customer?.notes || '',
    status: customer?.status || 'pending',
    returnedDate: customer?.returnedDate ? toVietnamDate(new Date(customer.returnedDate)) : '',
    returnedTime: customer?.returnedDate ? toVietnamTime(new Date(customer.returnedDate)) : '',
  })

  const [rawCost, setRawCost] = useState('')

  useEffect(() => {
    if (open) {
      getOptions().then((data) => {
        const grouped: Record<PredefinedCategory, string[]> = { deviceType: [], deviceModel: [], accessories: [], conditionBefore: [], conditionAfter: [], receivedBy: [], repairedBy: [] }
        const models: { value: string; parentValue: string | null }[] = []
        for (const item of data as { category: string; value: string; parentValue: string | null }[]) {
          if (item.category === 'deviceType') grouped.deviceType.push(item.value)
          else if (item.category === 'deviceModel') models.push({ value: item.value, parentValue: item.parentValue })
          else if (item.category === 'accessories') grouped.accessories.push(item.value)
          else if (item.category === 'conditionBefore') grouped.conditionBefore.push(item.value)
          else if (item.category === 'conditionAfter') grouped.conditionAfter.push(item.value)
          else if (item.category === 'receivedBy') grouped.receivedBy.push(item.value)
          else if (item.category === 'repairedBy') grouped.repairedBy.push(item.value)
        }
        setSuggestions(grouped)
        setModelOptions(models)
      })
      getExistingCustomers().then(setExistingCustomers)
    }
  }, [open])

  const getFilteredModels = () => {
    if (!formData.deviceType) return modelOptions.map((m) => m.value)
    return modelOptions.filter((m) => m.parentValue === formData.deviceType).map((m) => m.value)
  }

  useEffect(() => {
    if (customer?.repairCost && Number(customer.repairCost) > 0) {
      setRawCost(String(Number(customer.repairCost) / 1000))
    } else {
      setRawCost('')
    }
  }, [customer])

  useEffect(() => {
    setFormData({
      customerName: customer?.customerName || '',
      phone: customer?.phone || '',
      receivedDate: customer?.receivedDate ? toVietnamDate(new Date(customer.receivedDate)) : toVietnamDate(new Date()),
      receivedTime: customer?.receivedDate ? toVietnamTime(new Date(customer.receivedDate)) : toVietnamTime(new Date()),
      deviceType: customer?.deviceType || '',
      deviceModel: customer?.deviceModel || '',
      accessories: customer?.accessories || '',
      conditionBefore: customer?.conditionBefore || '',
      conditionAfter: customer?.conditionAfter || '',
      receivedBy: customer?.receivedBy || '',
      repairedBy: customer?.repairedBy || '',
      repairCost: customer?.repairCost || '',
      notes: customer?.notes || '',
      status: customer?.status || 'pending',
      returnedDate: customer?.returnedDate ? toVietnamDate(new Date(customer.returnedDate)) : '',
      returnedTime: customer?.returnedDate ? toVietnamTime(new Date(customer.returnedDate)) : '',
    })
  }, [customer])

  useEffect(() => {
    if (formData.status === 'returned' && !formData.returnedDate) {
      setFormData((prev) => ({
        ...prev,
        returnedDate: toVietnamDate(new Date()),
        returnedTime: toVietnamTime(new Date()),
      }))
    }
  }, [formData.status, formData.returnedDate])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    const digits = input.replace(/[^\d]/g, '')
    setRawCost(digits)
    if (digits && Number(digits) > 0) {
      setFormData((prev) => ({ ...prev, repairCost: String(Number(digits) * 1000) }))
    } else {
      setFormData((prev) => ({ ...prev, repairCost: '' }))
    }
  }

  const getCostPreview = () => {
    if (!rawCost || Number(rawCost) <= 0) return null
    const actual = Number(rawCost) * 1000
    return `${formatVND(actual)}đ ${getCostSuffixLabel(actual)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate phone: must be exactly 10 digits
    const phoneDigits = formData.phone.replace(/\D/g, '')
    if (phoneDigits.length !== 10) {
      setError('Số điện thoại phải đủ 10 số')
      return
    }
    if (!isValidVietnamPhone(formData.phone)) {
      setError('Đầu số điện thoại không hợp lệ')
      return
    }

    setLoading(true)

    const submitData = {
      customerName: formData.customerName,
      phone: formData.phone,
      receivedDate: `${formData.receivedDate}T${formData.receivedTime}:00+07:00`,
      deviceType: formData.deviceType,
      deviceModel: formData.deviceModel || undefined,
      accessories: formData.accessories || undefined,
      conditionBefore: formData.conditionBefore || undefined,
      conditionAfter: formData.conditionAfter || undefined,
      receivedBy: formData.receivedBy || undefined,
      repairedBy: formData.repairedBy || undefined,
      repairCost: formData.repairCost || undefined,
      notes: formData.notes || undefined,
      status: formData.status,
      returnedDate: formData.returnedDate ? `${formData.returnedDate}T${formData.returnedTime}:00+07:00` : undefined,
    }

    try {
      if (customer?.id) {
        await updateCustomer(customer.id, submitData)
      } else {
        await createCustomer(submitData)
      }
      onOpenChange(false)
      toast.success(customer ? 'Cập nhật thành công!' : 'Thêm khách hàng thành công!')
      onSuccess?.()
      setFormData({
        customerName: '',
        phone: '',
        receivedDate: toVietnamDate(new Date()),
        receivedTime: toVietnamTime(new Date()),
        deviceType: '',
        deviceModel: '',
        accessories: '',
        conditionBefore: '',
        conditionAfter: '',
        receivedBy: '',
        repairedBy: '',
        repairCost: '',
        notes: '',
        status: 'pending',
        returnedDate: '',
        returnedTime: '',
      })
      setRawCost('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const isEditing = !!customer?.id

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[98vw] lg:max-w-7xl max-h-[95vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {isEditing ? (
              <><FileText className="h-5 w-5 text-blue-600" />Chỉnh sửa khách hàng</>
            ) : (
              <><User className="h-5 w-5 text-blue-600" />Thêm khách hàng mới</>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Ticket ID badge */}
          {isEditing && (
            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-100">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mã phiếu</span>
              <span className="text-sm font-bold text-blue-600">{customer.ticketId}</span>
              <span className={`ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(customer.status)}`}>
                {getStatusLabel(customer.status)}
              </span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-sm text-red-700">{error}</div>
          )}

          {/* === Row 1: Customer + Device + Condition === */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Customer */}
            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-100 text-blue-600">
                  <User className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Khách hàng</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">Tên khách hàng <span className="text-red-400">*</span></Label>
                  <SuggestInput
                    id="customerName"
                    name="customerName"
                    value={formData.customerName}
                    onChange={(e) => {
                      handleChange(e)
                      const match = existingCustomers.find((c) => c.customerName === e.target.value)
                      if (match) {
                        setFormData((prev) => ({ ...prev, phone: match.phone }))
                      } else if (!e.target.value) {
                        setFormData((prev) => ({ ...prev, phone: '' }))
                      }
                    }}
                    required
                    placeholder="Nhập tên..."
                    suggestions={existingCustomers.map((c) => c.customerName)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">Số điện thoại <span className="text-red-400">*</span></Label>
                  <SuggestInput
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      // Only allow digits, max 10
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setFormData((prev) => ({ ...prev, phone: val }))
                      const match = existingCustomers.find((c) => c.phone === val)
                      if (match) setFormData((prev) => ({ ...prev, customerName: match.customerName }))
                    }}
                    required
                    placeholder="0xxxxxxxxx"
                    suggestions={
                      formData.customerName && existingCustomers.some((c) => c.customerName === formData.customerName)
                        ? existingCustomers.filter((c) => c.customerName === formData.customerName).map((c) => c.phone)
                        : []
                    }
                  />
                  {formData.phone.length >= 3 && detectCarrier(formData.phone) && (
                    <div className="mt-2">
                      <img
                        src={detectCarrier(formData.phone)!.logo}
                        alt={detectCarrier(formData.phone)!.name}
                        className="h-5 w-auto object-contain"
                      />
                    </div>
                  )}
                  {formData.phone.length > 0 && formData.phone.length < 10 && (
                    <p className="text-[11px] text-amber-500 mt-0.5">Số điện thoại phải đủ 10 số</p>
                  )}
                  {formData.phone.length > 0 && formData.phone.length === 10 && !isValidVietnamPhone(formData.phone) && (
                    <p className="text-[11px] text-red-500 mt-0.5">Đầu số không hợp lệ</p>
                  )}
                </div>
              </div>
            </div>

            {/* Device */}
            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-100 text-blue-600">
                  <Monitor className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Thiết bị</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">Hiệu máy <span className="text-red-400">*</span></Label>
                  <SuggestInput
                    id="deviceType"
                    name="deviceType"
                    value={formData.deviceType}
                    onChange={handleChange}
                    required
                    placeholder="iPhone..."
                    suggestions={suggestions.deviceType}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">Model</Label>
                  <SuggestInput
                    id="deviceModel"
                    name="deviceModel"
                    value={formData.deviceModel}
                    onChange={handleChange}
                    placeholder="13 Pro..."
                    suggestions={getFilteredModels()}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">Phụ kiện</Label>
                  <SuggestInput
                    id="accessories"
                    name="accessories"
                    value={formData.accessories}
                    onChange={handleChange}
                    placeholder="Cáp, Sạc..."
                    suggestions={suggestions.accessories}
                  />
                </div>
              </div>
            </div>

            {/* Condition */}
            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-100 text-blue-600">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Tình trạng thiết bị</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">Trước khi sửa</Label>
                  <SuggestTextarea
                    id="conditionBefore"
                    name="conditionBefore"
                    value={formData.conditionBefore}
                    onChange={handleChange}
                    placeholder="Màn hình vỡ, pin yếu..."
                    suggestions={suggestions.conditionBefore}
                    rows={2}
                  />
                  {formData.conditionBefore && formData.conditionBefore.length > 50 && (
                    <button type="button" onClick={() => setViewContent({ field: 'conditionBefore', label: 'Trước khi sửa' })} className="text-xs text-blue-600 hover:text-blue-800 hover:underline">Xem tất cả</button>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">Sau khi sửa</Label>
                  <SuggestTextarea
                    id="conditionAfter"
                    name="conditionAfter"
                    value={formData.conditionAfter}
                    onChange={handleChange}
                    placeholder="Màn hình mới, pin tốt..."
                    suggestions={suggestions.conditionAfter}
                    rows={2}
                  />
                  {formData.conditionAfter && formData.conditionAfter.length > 50 && (
                    <button type="button" onClick={() => setViewContent({ field: 'conditionAfter', label: 'Sau khi sửa' })} className="text-xs text-blue-600 hover:text-blue-800 hover:underline">Xem tất cả</button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* === Row 2: Repair info + Status + Notes === */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Repair info */}
            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-100 text-blue-600">
                  <Wrench className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Sửa chữa</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">Người nhận</Label>
                  <SuggestInput
                    id="receivedBy"
                    name="receivedBy"
                    value={formData.receivedBy}
                    onChange={handleChange}
                    placeholder="Nhập tên..."
                    suggestions={suggestions.receivedBy}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">Người sửa</Label>
                  <SuggestInput
                    id="repairedBy"
                    name="repairedBy"
                    value={formData.repairedBy}
                    onChange={handleChange}
                    placeholder="Nhập tên..."
                    suggestions={suggestions.repairedBy}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs font-medium text-gray-600">Ngày nhận <span className="text-red-400">*</span></Label>
                  <VietnamDateSelect
                    value={formData.receivedDate}
                    onChange={(val) => setFormData((prev) => ({ ...prev, receivedDate: val }))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-600">Giờ nhận <span className="text-red-400">*</span></Label>
                  <Input
                    name="receivedTime"
                    type="time"
                    value={formData.receivedTime}
                    onChange={handleChange}
                    required
                    className="h-10"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs font-medium text-gray-600">Giá sửa (nghìn VNĐ)</Label>
                  <Input
                    id="repairCost"
                    type="number"
                    value={rawCost}
                    onChange={handleCostChange}
                    placeholder="10, 100..."
                    min="0"
                    className="w-full h-10"
                  />
                  {getCostPreview() && (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 inline-block mt-1">
                      {getCostPreview()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-100 text-blue-600">
                  <CalendarCheck className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Trạng thái</span>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600">Trạng thái</Label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="pending">{getStatusLabel('pending')}</option>
                  <option value="repairing">{getStatusLabel('repairing')}</option>
                  <option value="completed">{getStatusLabel('completed')}</option>
                  <option value="returned">{getStatusLabel('returned')}</option>
                </select>
              </div>
              {formData.status === 'returned' && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Ngày trả máy</Label>
                    <VietnamDateSelect
                      value={formData.returnedDate}
                      onChange={(val) => setFormData((prev) => ({ ...prev, returnedDate: val }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Giờ trả</Label>
                    <Input
                      name="returnedTime"
                      type="time"
                      value={formData.returnedTime}
                      onChange={handleChange}
                      className="w-full h-10"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-100 text-blue-600">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Ghi chú</span>
              </div>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Ghi chú thêm nếu cần..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="pt-3 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="min-w-[90px] h-10"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[140px] h-10 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang lưu...
                </span>
              ) : isEditing ? (
                'Cập nhật'
              ) : (
                'Thêm khách hàng'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Popup xem nội dung đầy đủ */}
      <Dialog open={!!viewContent} onOpenChange={(v) => { if (!v) setViewContent(null) }}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{viewContent?.label}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Textarea
              value={viewContent ? formData[viewContent.field as keyof typeof formData] as string : ''}
              onChange={(e) => {
                if (viewContent) {
                  setFormData((prev) => ({ ...prev, [viewContent.field]: e.target.value }))
                }
              }}
              rows={10}
              className="resize-none w-full"
            />
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setViewContent(null)} className="bg-blue-600 hover:bg-blue-700 text-white">Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

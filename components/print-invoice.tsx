'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Customer } from '@/lib/types'
import { getStatusLabel, formatVietnamDateTime } from '@/lib/utils'
import { Printer } from 'lucide-react'

interface PrintInvoiceProps {
  customer: Customer
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PrintInvoice({
  customer,
  open,
  onOpenChange,
}: PrintInvoiceProps) {
  const handlePrint = () => {
    window.open(`/print/${customer.id}`, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Phiếu sửa chữa - {customer?.ticketId}</DialogTitle>
        </DialogHeader>

        <div className="p-8 bg-white border rounded-lg space-y-4 text-sm">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <h1 className="text-2xl font-bold">PHIẾU SỬA CHỮA THIẾT BỊ ĐIỆN TỬ</h1>
            <p className="text-gray-600 mt-2">Mã phiếu: <strong>{customer?.ticketId}</strong></p>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Tên khách hàng:</p>
              <p className="font-semibold">{customer?.customerName}</p>
            </div>
            <div>
              <p className="text-gray-600">Số điện thoại:</p>
              <p className="font-semibold">{customer?.phone}</p>
            </div>
            <div>
              <p className="text-gray-600">Ngày nhận máy:</p>
              <p className="font-semibold">
                {formatVietnamDateTime(customer?.receivedDate)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Ngày lập phiếu:</p>
              <p className="font-semibold">
                {new Date(customer?.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
            {customer.returnedDate && (
              <div>
                <p className="text-gray-600">Ngày trả máy:</p>
                <p className="font-semibold">
                  {formatVietnamDateTime(customer.returnedDate)}
                </p>
              </div>
            )}
            <div>
              <p className="text-gray-600">Trạng thái:</p>
              <p className="font-semibold">{getStatusLabel(customer.status)}</p>
            </div>
          </div>

          {/* Device Info */}
          <div className="border-t pt-4">
            <h2 className="font-bold mb-3">THÔNG TIN THIẾT BỊ</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Hiệu máy:</p>
                <p className="font-semibold">{customer?.deviceType}</p>
              </div>
              <div>
                <p className="text-gray-600">Model:</p>
                <p className="font-semibold">{customer?.deviceModel || '-'}</p>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-gray-600">Phụ kiện kèm theo:</p>
              <p className="font-semibold">{customer?.accessories || '-'}</p>
            </div>
          </div>

          {/* Conditions */}
          <div className="border-t pt-4">
            <h2 className="font-bold mb-3">TÌNH TRẠNG THIẾT BỊ</h2>
            <div>
              <p className="text-gray-600 font-semibold mb-1">Trước khi sửa:</p>
              <p className="bg-gray-50 p-2 rounded">{customer?.conditionBefore || '-'}</p>
            </div>
            <div className="mt-3">
              <p className="text-gray-600 font-semibold mb-1">Sau khi sửa:</p>
              <p className="bg-gray-50 p-2 rounded">{customer?.conditionAfter || '-'}</p>
            </div>
          </div>

          {/* Cost */}
          <div className="border-t pt-4 bg-blue-50 p-4 rounded">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Tổng cộng:</span>
              <span className="text-blue-600">
                {customer?.repairCost
                  ? `${Number(customer.repairCost).toLocaleString('vi-VN')}đ`
                  : '-'}
              </span>
            </div>
          </div>

          {/* Notes */}
          {customer?.notes && (
            <div className="border-t pt-4">
              <p className="text-gray-600 font-semibold mb-1">Ghi chú:</p>
              <p className="bg-gray-50 p-2 rounded">{customer.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-4 text-center text-gray-500 text-xs">
            <p>Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            In phiếu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

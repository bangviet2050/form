'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getCustomerHistory } from '@/app/actions/customers'
import { formatVietnamDateTime, getStatusLabel } from '@/lib/utils'
import type { Customer } from '@/lib/types'
import { Phone, Cpu, Wrench, Clock, UserCheck, FileText, DollarSign, Package, User } from 'lucide-react'
import { TruncateText } from '@/components/truncate-text'

interface CustomerHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerName: string
  phone: string
}

export function CustomerHistoryDialog({
  open,
  onOpenChange,
  customerName,
  phone,
}: CustomerHistoryDialogProps) {
  const [history, setHistory] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && customerName && phone) {
      setLoading(true)
      getCustomerHistory(customerName, phone).then((data) => {
        setHistory(data as Customer[])
        setLoading(false)
      })
    }
  }, [open, customerName, phone])

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' }
      case 'repairing': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' }
      case 'completed': return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' }
      case 'returned': return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', dot: 'bg-gray-400' }
      default: return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', dot: 'bg-gray-400' }
    }
  }

  const totalRevenue = history.reduce((sum, r) => sum + (r.repairCost ? Number(r.repairCost) : 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-xl">Lịch sử sửa máy</DialogTitle>
        </DialogHeader>

      {/* Customer info card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{customerName}</h3>
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
              <Phone className="h-3.5 w-3.5" />
              {phone}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{history.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">lần sửa máy</p>
            </div>
            <div className="h-10 w-px bg-blue-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{totalRevenue.toLocaleString('vi-VN')}đ</p>
              <p className="text-xs text-gray-500 mt-0.5">tổng chi phí</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Chưa có lịch sử sửa máy</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record, index) => {
            const style = getStatusStyle(record.status)
            const visitNumber = history.length - index

            return (
              <div
                key={record.id}
                className={`border rounded-xl overflow-hidden ${style.border} transition-all hover:shadow-md`}
              >
                {/* Card header */}
                <div className={`${style.bg} px-5 py-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-white border-2 border-current font-bold text-sm" style={{ color: 'inherit' }}>
                      {visitNumber}
                    </span>
                    <div>
                      <span className="font-semibold text-gray-800">Phiếu #{record.ticketId}</span>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {formatVietnamDateTime(record.receivedDate)}
                        </span>
                        {(record as any).staffName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {(record as any).staffName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text} border ${style.border}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {getStatusLabel(record.status)}
                  </span>
                </div>

                {/* Card body */}
                <div className="px-5 py-4 bg-white overflow-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Device info */}
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Cpu className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-xs text-gray-400 mb-0.5">Thiết bị</p>
                        <p className="text-sm font-medium text-gray-800 break-all">
                          {record.deviceType}
                          {record.deviceModel && (
                            <span className="text-gray-500 font-normal"> — {record.deviceModel}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Accessories */}
                    {record.accessories && (
                      <div className="flex items-start gap-2.5">
                        <Package className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 mb-0.5">Phụ kiện</p>
                          <p className="text-sm text-gray-700">
                            <TruncateText text={record.accessories} maxLength={50} title="Phụ kiện" />
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Cost */}
                    {record.repairCost && (
                      <div className="flex items-start gap-2.5 min-w-0">
                        <DollarSign className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 mb-0.5">Giá sửa</p>
                          <p className="text-sm font-semibold text-emerald-600">
                            {Number(record.repairCost).toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Received by */}
                    {record.receivedBy && (
                      <div className="flex items-start gap-2.5 min-w-0">
                        <UserCheck className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 mb-0.5">Người nhận</p>
                          <p className="text-sm text-gray-700 break-all">{record.receivedBy}</p>
                        </div>
                      </div>
                    )}

                    {/* Repaired by */}
                    {record.repairedBy && (
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Wrench className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 mb-0.5">Người sửa</p>
                          <p className="text-sm text-gray-700 break-all">{record.repairedBy}</p>
                        </div>
                      </div>
                    )}

                    {/* Returned date */}
                    {record.returnedDate && (
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Clock className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 mb-0.5">Ngày trả</p>
                          <p className="text-sm text-gray-700">{formatVietnamDateTime(record.returnedDate)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Condition section */}
                  {(record.conditionBefore || record.conditionAfter) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-dashed border-gray-200 overflow-hidden">
                      {record.conditionBefore && (
                        <div className="bg-red-50 rounded-lg p-3 overflow-hidden">
                          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Tình trạng trước sửa</p>
                          <p className="text-sm text-red-700">
                            <TruncateText text={record.conditionBefore} maxLength={80} title="Tình trạng trước sửa" />
                          </p>
                        </div>
                      )}
                      {record.conditionAfter && (
                        <div className="bg-green-50 rounded-lg p-3 overflow-hidden">
                          <p className="text-xs font-semibold text-green-500 uppercase tracking-wider mb-1">Tình trạng sau sửa</p>
                          <p className="text-sm text-green-700">
                            <TruncateText text={record.conditionAfter} maxLength={80} title="Tình trạng sau sửa" />
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {record.notes && (
                    <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                      <div className="flex items-start gap-2.5">
                        <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 mb-0.5">Ghi chú</p>
                          <p className="text-sm text-gray-600">
                            <TruncateText text={record.notes} maxLength={80} title="Ghi chú" />
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error.message, error.digest)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Đã xảy ra lỗi
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Không thể tải trang dashboard. Vui lòng thử lại hoặc đăng nhập lại.
          </p>
          {error.digest && (
            <p className="text-xs text-gray-400 mb-4 font-mono">
              Mã lỗi: {error.digest}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Button
              onClick={reset}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Thử lại
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/sign-in')}
            >
              Đăng nhập lại
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

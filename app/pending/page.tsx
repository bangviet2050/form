'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Clock, LogOut, RefreshCw } from 'lucide-react'

export default function PendingPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; email: string; status: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkStatus()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      checkStatus()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const checkStatus = async () => {
    setLoading(true)
    const u = await getCurrentUser() as any
    if (!u) {
      router.push('/sign-in')
      return
    }
    setUser({ name: u.name, email: u.email, status: u.status })
    setLoading(false)

    // If approved, redirect to dashboard
    if (u.status === 'approved') {
      router.push('/dashboard')
      return
    }
    // If rejected, sign out and redirect to sign-in
    if (u.status === 'rejected') {
      await signOut()
      router.push('/sign-in?error=' + encodeURIComponent('Tài khoản đã bị từ chối.'))
      return
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/sign-in')
    router.refresh()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center px-4">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-8 shadow-lg text-center">
        <div className="flex justify-center mb-6">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-amber-100">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Chờ phê duyệt
        </h1>

        <p className="text-gray-600 mb-6">
          Tài khoản của bạn đang chờ admin phê duyệt.
          <br />
          Vui lòng đợi hoặc liên hệ quản trị viên.
        </p>

        {user && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-500">Thông tin tài khoản:</p>
            <p className="text-sm font-medium text-gray-800 mt-1">
              {user.name || 'Chưa đặt tên'}
            </p>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            onClick={checkStatus}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Kiểm tra lại trạng thái
          </Button>
          <p className="text-xs text-gray-400 mt-2">Tự động kiểm tra mỗi 5 giây...</p>

          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-red-600 hover:border-red-200"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </Button>
        </div>
      </Card>
    </main>
  )
}

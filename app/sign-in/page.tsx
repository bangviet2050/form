import { AuthForm } from '@/components/auth-form'

export const metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập vào hệ thống quản lý khách hàng',
}

export default function SignInPage() {
  return <AuthForm mode="sign-in" />
}

'use server'

import {
  createUser,
  getUserByEmail,
  verifyPassword,
  createSession,
  deleteSession,
  getSession,
  SESSION_COOKIE,
  SESSION_DURATION_MS,
} from '@/lib/auth'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'

export async function signUp(email: string, password: string, name: string) {
  // Check if user already exists
  const existing = await getUserByEmail(email)
  if (existing) {
    return { error: 'Email đã được sử dụng' }
  }

  const user = await createUser(email, password, name)

  // If user is pending (not first user), create session but indicate pending
  if (user.status === 'pending') {
    const token = await createSession(user.id)
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_MS / 1000,
      path: '/',
    })
    return { user, status: 'pending' }
  }

  // First user (admin) goes straight to dashboard
  const token = await createSession(user.id)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000,
    path: '/',
  })

  return { user }
}

export async function signIn(email: string, password: string) {
  const existingUser = await getUserByEmail(email)
  if (!existingUser) {
    return { error: 'Email hoặc mật khẩu không đúng' }
  }

  const valid = await verifyPassword(password, existingUser.password)
  if (!valid) {
    return { error: 'Email hoặc mật khẩu không đúng' }
  }

  // Check user status
  if (existingUser.status === 'pending') {
    return { error: 'Tài khoản đang chờ admin phê duyệt', status: 'pending' }
  }
  if (existingUser.status === 'rejected') {
    return { error: 'Tài khoản đã bị từ chối. Vui lòng liên hệ admin.', status: 'rejected' }
  }
  if (existingUser.status === 'deleted') {
    // Reset to pending — treat as new account
    await db.update(user).set({ status: 'pending', role: 'staff', canAddOptions: false, permissions: null, updatedAt: new Date() }).where(eq(user.id, existingUser.id))
    // Create session and redirect to pending page (like new account)
    const token = await createSession(existingUser.id)
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_MS / 1000,
      path: '/',
    })
    return { status: 'pending' }
  }

  const token = await createSession(existingUser.id)

  // Set session cookie
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000,
    path: '/',
  })

  const { password: _, ...safeUser } = existingUser
  return { user: safeUser }
}

export async function signOut() {
  await deleteSession()

  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getCurrentUser() {
  const result = await getSession()
  return result?.user || null
}

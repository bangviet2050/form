import { db } from '@/lib/db'
import { user, session } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

const SESSION_COOKIE = 'session_token'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function sanitizeUser<T extends { password?: string | null }>(u: T) {
  const { password: _, ...safeUser } = u
  return safeUser
}

// --- Password helpers ---

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// --- Session helpers ---

export async function createSession(userId: string): Promise<string> {
  const token = randomUUID()
  const id = randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

  await db.insert(session).values({
    id,
    userId,
    token,
    expiresAt,
  })

  return token
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (!token) return null

  const result = await db
    .select({
      session: session,
      user: user,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(eq(session.token, token))
    .limit(1)

  if (result.length === 0) return null

  const { session: s, user: u } = result[0]

  // Check expiration
  if (new Date(s.expiresAt) < new Date()) {
    await db.delete(session).where(eq(session.token, token))
    return null
  }

  const safeUser = sanitizeUser(u)
  return { session: s, user: safeUser }
}

export async function deleteSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (token) {
    await db.delete(session).where(eq(session.token, token))
  }
}

// --- User helpers ---

async function isFirstUser(): Promise<boolean> {
  const result = await db.select({ count: sql<number>`count(*)` }).from(user)
  return Number(result[0]?.count) === 0
}

export async function createUser(email: string, password: string, name: string) {
  const hashedPassword = await hashPassword(password)
  const id = randomUUID()
  const isFirst = await isFirstUser()

  const now = new Date()
  const result = await db
    .insert(user)
    .values({
      id,
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
      role: isFirst ? 'admin' : 'staff',
      status: isFirst ? 'approved' : 'pending',
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  return sanitizeUser(result[0]!)
}

export async function getUserByEmail(email: string) {
  const result = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1)

  return result[0] || null
}

// --- Google OAuth helpers ---

export async function findOrCreateGoogleUser(email: string, name: string, picture?: string) {
  const existing = await getUserByEmail(email)
  if (existing) {
    // If user was deleted, reset to pending (treat as new account)
    if (existing.status === 'deleted') {
      const now = new Date()
      const updated = await db
        .update(user)
        .set({ status: 'pending', role: 'staff', canAddOptions: false, permissions: null, avatar: picture || existing.avatar, updatedAt: now })
        .where(eq(user.id, existing.id))
        .returning()
      return { ...sanitizeUser(updated[0]!), _wasDeleted: true }
    }
    // Update avatar if Google provides one and user doesn't have it
    if (picture && !existing.avatar) {
      await db.update(user).set({ avatar: picture, updatedAt: new Date() }).where(eq(user.id, existing.id))
    }
    return sanitizeUser(existing)
  }

  const isFirst = await isFirstUser()

  // Create user with random password (Google users don't need a password)
  const id = randomUUID()
  const hashedPassword = await hashPassword(randomUUID())

  const now = new Date()
  const result = await db
    .insert(user)
    .values({
      id,
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
      role: isFirst ? 'admin' : 'staff',
      status: isFirst ? 'approved' : 'pending',
      avatar: picture || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  return sanitizeUser(result[0]!)
}

export { SESSION_COOKIE, SESSION_DURATION_MS }

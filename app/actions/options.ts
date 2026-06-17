'use server'

import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { predefinedOptions } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/app/actions/activity-log'

async function requireAuth() {
  const result = await getSession()
  if (!result?.user) {
    throw new Error('Unauthorized')
  }
  return result.user
}

export type PredefinedCategory = 'deviceType' | 'deviceModel' | 'accessories' | 'conditionBefore' | 'conditionAfter' | 'receivedBy' | 'repairedBy'

export async function getOptions(category?: PredefinedCategory) {
  try {
    await requireAuth()

    // Options are shared — no userId filter
    if (category) {
      return db
        .select()
        .from(predefinedOptions)
        .where(eq(predefinedOptions.category, category))
        .orderBy(predefinedOptions.value)
    }

    return db
      .select()
      .from(predefinedOptions)
      .orderBy(predefinedOptions.category, predefinedOptions.value)
  } catch (error) {
    console.error('getOptions error:', error)
    return []
  }
}

export async function addOption(
  category: PredefinedCategory,
  value: string,
  parentValue?: string
) {
  const user = await requireAuth()

  // Admin can always add; staff needs canAddOptions permission
  if (user.role !== 'admin' && !user.canAddOptions) {
    throw new Error('Bạn không có quyền thêm tùy chọn. Vui lòng liên hệ admin.')
  }

  const trimmed = value.trim()
  if (!trimmed) throw new Error('Giá trị không được để trống')

  // Check duplicate (same category + value + parentValue) — globally
  const conditions = [
    eq(predefinedOptions.category, category),
    eq(predefinedOptions.value, trimmed),
  ]
  if (parentValue) {
    conditions.push(eq(predefinedOptions.parentValue, parentValue))
  }

  const existing = await db
    .select()
    .from(predefinedOptions)
    .where(and(...conditions))

  if (existing.length > 0) throw new Error('Giá trị đã tồn tại')

  const insertResult = await db
    .insert(predefinedOptions)
    .values({
      userId: user.id,
      category,
      value: trimmed,
      parentValue: parentValue || null,
    })
    .returning()

  revalidatePath('/admin')
  revalidatePath('/dashboard')

  await logActivity(
    user.id,
    user.name,
    'add_option',
    `${category}: ${trimmed}`,
    parentValue ? `Parent: ${parentValue}` : undefined
  )

  return insertResult[0]
}

export async function updateOption(id: number, newValue: string) {
  const user = await requireAuth()
  if (user.role !== 'admin') throw new Error('Chỉ admin mới có thể sửa tùy chọn')

  const trimmed = newValue.trim()
  if (!trimmed) throw new Error('Giá trị không được để trống')

  const existing = await db
    .select()
    .from(predefinedOptions)
    .where(eq(predefinedOptions.id, id))

  if (existing.length === 0) {
    throw new Error('Không tìm thấy mục cần cập nhật')
  }

  const option = existing[0]
  if (option.value === trimmed) {
    return option
  }

  // Check duplicate globally
  const duplicateConditions = [
    eq(predefinedOptions.category, option.category),
    eq(predefinedOptions.value, trimmed),
  ]
  if (option.parentValue) {
    duplicateConditions.push(eq(predefinedOptions.parentValue, option.parentValue))
  }

  const duplicate = await db
    .select()
    .from(predefinedOptions)
    .where(and(...duplicateConditions))

  if (duplicate.length > 0) {
    throw new Error('Giá trị đã tồn tại')
  }

  await db
    .update(predefinedOptions)
    .set({ value: trimmed })
    .where(eq(predefinedOptions.id, id))

  if (option.category === 'deviceType') {
    await db
      .update(predefinedOptions)
      .set({ parentValue: trimmed })
      .where(
        and(
          eq(predefinedOptions.category, 'deviceModel'),
          eq(predefinedOptions.parentValue, option.value)
        )
      )
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')

  await logActivity(
    user.id,
    user.name,
    'update_option',
    `${option.category}: ${option.value} → ${trimmed}`
  )

  return { ...option, value: trimmed }
}

export async function deleteOption(id: number) {
  const user = await requireAuth()
  if (user.role !== 'admin') throw new Error('Chỉ admin mới có thể xóa tùy chọn')

  await db.transaction(async (tx) => {
    const option = await tx
      .select()
      .from(predefinedOptions)
      .where(eq(predefinedOptions.id, id))
      .limit(1)

    if (!option.length) {
      throw new Error('Không tìm thấy tùy chọn')
    }

    if (option[0].category === 'deviceType') {
      await tx.delete(predefinedOptions).where(
        and(
          eq(predefinedOptions.category, 'deviceModel'),
          eq(predefinedOptions.parentValue, option[0].value)
        )
      )
    }

    await tx.delete(predefinedOptions).where(eq(predefinedOptions.id, id))

    await logActivity(
      user.id,
      user.name,
      'delete_option',
      option[0].category,
      `Xóa ${option[0].category}: ${option[0].value}`
    )
  })

  revalidatePath('/admin')
  revalidatePath('/dashboard')
}

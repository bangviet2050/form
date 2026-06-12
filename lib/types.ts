import { InferSelectModel } from 'drizzle-orm'
import { customers } from '@/lib/db/schema'

export type Customer = InferSelectModel<typeof customers>

export type CustomerStatus = 'pending' | 'repairing' | 'completed' | 'returned'

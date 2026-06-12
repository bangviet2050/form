import {
  boolean,
  pgTable,
  text,
  timestamp,
  serial,
  decimal,
  integer,
  index,
} from 'drizzle-orm/pg-core'

// --- User table -------------------------------------------------

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull().default('staff'), // 'admin' | 'staff'
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  canAddOptions: boolean('canaddoptions').notNull().default(false), // admin can grant this to staff
  permissions: text('permissions'), // JSON: { categories: { deviceType: true, ... }, tabs: { reports: true, logs: true } }
  avatar: text('avatar'), // Google profile picture URL
  createdAt: timestamp('createdat').notNull().defaultNow(),
  updatedAt: timestamp('updatedat').notNull().defaultNow(),
})

// --- Predefined options (device types, models, accessories) ----

export const predefinedOptions = pgTable('predefined_options', {
  id: serial('id').primaryKey(),
  userId: text('userid')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  category: text('category').notNull(), // 'deviceType' | 'deviceModel' | 'accessories'
  value: text('value').notNull(),
  parentValue: text('parentvalue'), // For deviceModel: links to deviceType value (e.g. "Dell")
  createdAt: timestamp('createdat').notNull().defaultNow(),
})

// --- Session table -----------------------------------------------

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('userid')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expiresat').notNull(),
  createdAt: timestamp('createdat').notNull().defaultNow(),
})

// --- App tables: Customers ---------------------------------------

export const customers = pgTable(
  'customers',
  {
    id: serial('id').primaryKey(),
    userId: text('userid').references(() => user.id, { onDelete: 'set null' }),
    ticketId: text('ticketid').notNull().unique(),
    customerName: text('customername').notNull(),
    phone: text('phone').notNull(),
    receivedDate: timestamp('receiveddate').notNull(),
    deviceType: text('devicetype').notNull(),
    deviceModel: text('devicemodel'),
    accessories: text('accessories'),
    conditionBefore: text('conditionbefore'),
    conditionAfter: text('conditionafter'),
    receivedBy: text('receivedby'),
    repairedBy: text('repairedby'),
    repairCost: decimal('repaircost', { precision: 10, scale: 2 }),
    notes: text('notes'),
    status: text('status').notNull().default('pending'),
    statusHistory: text('statushistory'),
    returnedDate: timestamp('returneddate'),
    createdAt: timestamp('createdat').notNull().defaultNow(),
    updatedAt: timestamp('updatedat').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('customers_userId_idx').on(table.userId),
    statusIdx: index('customers_status_idx').on(table.status),
    createdAtIdx: index('customers_createdAt_idx').on(table.createdAt),
  })
)

// --- Activity Log -----------------------------------------------

export const activityLog = pgTable(
  'activity_log',
  {
    id: serial('id').primaryKey(),
    userId: text('userid').references(() => user.id, { onDelete: 'set null' }),
    userName: text('username'),
    action: text('action').notNull(), // 'create_order' | 'update_order' | 'delete_order' | 'approve_user' | 'reject_user' | 'add_option' | 'delete_option' | 'update_option' | 'change_role' | 'toggle_permission' | 'export_report'
    target: text('target'), // what was affected (e.g. ticket ID, user email, option value)
    details: text('details'), // additional info
    createdAt: timestamp('createdat').notNull().defaultNow(),
  },
  (table) => ({
    createdAtIdx: index('activity_log_createdAt_idx').on(table.createdAt),
    actionIdx: index('activity_log_action_idx').on(table.action),
  })
)

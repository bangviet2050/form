import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const MAX_POOL_SIZE = process.env.NODE_ENV === 'production' ? 5 : 10
const IDLE_TIMEOUT_MS = 20_000
const CONNECTION_TIMEOUT_MS = 5_000

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: MAX_POOL_SIZE,
  idleTimeoutMillis: IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  // Allow serverless functions to close connections properly
  allowExitOnIdle: true,
})

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err)
})

export const db = drizzle(pool, { schema })

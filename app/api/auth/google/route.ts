import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

const REDIRECT_PATH = '/api/auth/google/callback'

function getRedirectUri(request: NextRequest) {
  const url = new URL(REDIRECT_PATH, request.url)
  return url.toString()
}

export async function GET(request: NextRequest) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Google OAuth chưa được cấu hình. Vui lòng thêm GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET vào .env' },
      { status: 500 }
    )
  }

  // Generate state for CSRF protection
  const state = randomUUID()

  // Build Google OAuth URL
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: getRedirectUri(request),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  // Set state in cookie for verification in callback
  const response = NextResponse.redirect(googleAuthUrl)
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  return response
}

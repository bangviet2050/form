import { NextRequest, NextResponse } from 'next/server'
import { findOrCreateGoogleUser, createSession, SESSION_COOKIE, SESSION_DURATION_MS } from '@/lib/auth'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

const REDIRECT_PATH = '/api/auth/google/callback'

function getRedirectUri(request: NextRequest) {
  const url = new URL(REDIRECT_PATH, request.url)
  return url.toString()
}

interface GoogleTokenResponse {
  access_token: string
  id_token?: string
  token_type: string
}

interface GoogleUserInfo {
  sub: string
  email: string
  email_verified: boolean
  name: string
  picture: string
}

async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Lỗi đổi token Google: ${error}`)
  }

  return response.json()
}

async function getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error('Lỗi lấy thông tin user từ Google')
  }

  return response.json()
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle user denial or error
  if (error) {
    return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent('Đăng nhập Google bị từ chối')}`, request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/sign-in?error=Thiếu mã xác thực', request.url))
  }

  // Verify CSRF state
  const savedState = request.cookies.get('google_oauth_state')?.value
  if (state !== savedState) {
    return NextResponse.redirect(new URL('/sign-in?error=Lỗi xác thực CSRF', request.url))
  }

  try {
    // Exchange code for tokens
    const redirectUri = getRedirectUri(request)
    const tokens = await exchangeCodeForTokens(code, redirectUri)

    // Get user info
    const userInfo = await getUserInfo(tokens.access_token)

    if (!userInfo.email) {
      return NextResponse.redirect(new URL('/sign-in?error=Không lấy được email từ Google', request.url))
    }

    // Find or create user
    const dbUser = await findOrCreateGoogleUser(userInfo.email, userInfo.name, userInfo.picture)

    // Check user status
    if (dbUser.status === 'pending' || (dbUser as any)._wasDeleted) {
      // Create session so user can see the pending page, then redirect there
      const token = await createSession(dbUser.id)
      const response = NextResponse.redirect(new URL('/pending', request.url))
      response.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_DURATION_MS / 1000,
        path: '/',
      })
      response.cookies.set('google_oauth_state', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      })
      return response
    }

    if (dbUser.status === 'rejected') {
      return NextResponse.redirect(
        new URL(`/sign-in?error=${encodeURIComponent('Tài khoản đã bị từ chối. Vui lòng liên hệ admin.')}`, request.url)
      )
    }

    if (dbUser.status === 'deleted') {
      return NextResponse.redirect(
        new URL(`/sign-in?error=${encodeURIComponent('Tài khoản đã bị xóa. Vui lòng liên hệ admin.')}`, request.url)
      )
    }

    // Create session
    const token = await createSession(dbUser.id)

    // Redirect to dashboard with session cookie
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_MS / 1000,
      path: '/',
    })

    // Clear the OAuth state cookie
    response.cookies.set('google_oauth_state', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('Google OAuth callback error:', err)
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent('Lỗi đăng nhập Google. Vui lòng thử lại.')}`, request.url)
    )
  }
}

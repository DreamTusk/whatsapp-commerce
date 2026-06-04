'use client'

import Cookies from 'js-cookie'
import type { User } from '@/types'

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const USER_KEY = 'auth_user'
const ROLE_KEY = 'auth_role'
const PENDING_USER_ID_KEY = 'pending_user_id'
const IS_VERIFIED_KEY = 'is_verified'

export const auth = {
  setTokens(accessToken: string, refreshToken: string) {
    Cookies.set(ACCESS_TOKEN_KEY, accessToken, { expires: 1 / 36, sameSite: 'lax' })
    Cookies.set(REFRESH_TOKEN_KEY, refreshToken, { expires: 21, sameSite: 'lax' })
  },

  getAccessToken(): string | undefined {
    return Cookies.get(ACCESS_TOKEN_KEY)
  },

  getRefreshToken(): string | undefined {
    return Cookies.get(REFRESH_TOKEN_KEY)
  },

  setUser(user: User) {
    Cookies.set(USER_KEY, JSON.stringify(user), { expires: 21, sameSite: 'lax' })
  },

  getUser(): User | null {
    const raw = Cookies.get(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  },

  setRole(role: string) {
    Cookies.set(ROLE_KEY, role, { expires: 21, sameSite: 'lax' })
  },

  getRole(): string | null {
    return Cookies.get(ROLE_KEY) ?? null
  },

  setVerified(isVerified: boolean) {
    Cookies.set(IS_VERIFIED_KEY, String(isVerified), { expires: 21, sameSite: 'lax' })
  },

  isVerified(): boolean {
    return Cookies.get(IS_VERIFIED_KEY) !== 'false'
  },

  setPendingUserId(userId: string) {
    // 10 minutes — matches OTP expiry
    Cookies.set(PENDING_USER_ID_KEY, userId, { expires: 1 / 144, sameSite: 'lax' })
  },

  getPendingUserId(): string | undefined {
    return Cookies.get(PENDING_USER_ID_KEY)
  },

  clearPendingUserId() {
    Cookies.remove(PENDING_USER_ID_KEY)
  },

  clear() {
    Cookies.remove(ACCESS_TOKEN_KEY)
    Cookies.remove(REFRESH_TOKEN_KEY)
    Cookies.remove(USER_KEY)
    Cookies.remove(ROLE_KEY)
    Cookies.remove(PENDING_USER_ID_KEY)
    Cookies.remove(IS_VERIFIED_KEY)
  },

  isAuthenticated(): boolean {
    return !!Cookies.get(ACCESS_TOKEN_KEY)
  },
}

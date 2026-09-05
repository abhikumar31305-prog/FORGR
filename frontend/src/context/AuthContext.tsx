import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { UserSession } from '../types/auth'
import { loginWithBackend } from '../services/authApi'
import { setAccessToken, setUnauthorizedHandler } from '../api/client'
import { isJwtExpired } from '../utils/jwt'
import { AuthContext } from './auth-context'
import type { LoginPayload } from '../types/auth'

const SESSION_STORAGE_KEY = 'forgr_user_session'

function getSavedSession(): UserSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed: UserSession = JSON.parse(raw)
    if (parsed && parsed.accessToken) {
      if (isJwtExpired(parsed.accessToken)) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY)
        return null
      }
      setAccessToken(parsed.accessToken)
      return parsed
    }
  } catch (err) {
    console.warn('Failed to restore session from sessionStorage:', err)
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(getSavedSession)

  useEffect(() => {
    setUnauthorizedHandler(() => {
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY)
      } catch {
        void 0
      }
      setAccessToken(null)
      setSession(null)
    })

    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const nextSession = await loginWithBackend(payload)
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession))
    } catch {
      void 0
    }
    setAccessToken(nextSession.accessToken)
    setSession(nextSession)
    return nextSession
  }, [])

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    } catch {
      void 0
    }
    setAccessToken(null)
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      login,
      logout,
    }),
    [login, logout, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}


import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { LoginPayload, UserSession } from '../types/auth'
import { loginWithBackend } from '../services/authApi'
import { setAccessToken, setUnauthorizedHandler } from '../api/client'

interface AuthContextValue {
  session: UserSession | null
  login: (payload: LoginPayload) => Promise<UserSession>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null)

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccessToken(null)
      setSession(null)
    })

    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const nextSession = await loginWithBackend(payload)
    setAccessToken(nextSession.accessToken)
    setSession(nextSession)
    return nextSession
  }, [])

  const logout = useCallback(() => {
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

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}

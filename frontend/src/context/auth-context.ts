import { createContext } from 'react'
import type { LoginPayload, UserSession } from '../types/auth'

export interface AuthContextValue {
  session: UserSession | null
  login: (payload: LoginPayload) => Promise<UserSession>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

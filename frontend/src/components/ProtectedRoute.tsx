import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import type { Role } from '../types/auth'
import type { ReactNode } from 'react'
import { isJwtExpired } from '../utils/jwt'

interface ProtectedRouteProps {
  allowedRoles: Role[]
  children: ReactNode
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { session } = useAuth()
  const location = useLocation()

  if (!session || isJwtExpired(session.accessToken)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!allowedRoles.includes(session.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

import { apiRequest } from '../api/client'
import { getJwtExpiration } from '../utils/jwt'
import type { LoginPayload, LoginResponse, UserSession } from '../types/auth'

function toSession(response: LoginResponse): UserSession {
  return {
    id: response.user.id,
    name: response.user.name,
    email: response.user.email,
    role: response.user.role,
    studentId: response.user.student_id ?? null,
    linkedProfileId: response.user.linked_profile_id ?? null,
    createdAt: response.user.created_at,
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    tokenType: 'bearer',
    expiresAt: getJwtExpiration(response.access_token) ?? Math.floor(Date.now() / 1000) + 30 * 60,
  }
}

export async function loginWithBackend(payload: LoginPayload): Promise<UserSession> {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, false)

  return toSession(response)
}

export async function changePasswordApi(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  }, true)
}

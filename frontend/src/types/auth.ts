export type Role = 'student' | 'faculty' | 'placement_cell' | 'parent' | 'recruiter' | 'admin'

export interface UserSession {
  id: number
  name: string
  email: string
  role: Role
  studentId?: string | null
  linkedProfileId?: number | null
  createdAt?: string
  accessToken: string
  refreshToken: string
  tokenType: 'bearer'
  expiresAt: number
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthUserResponse {
  id: number
  name: string
  email: string
  role: Role
  linked_profile_id?: number | null
  student_id?: string | null
  created_at: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: 'bearer' | string
  user: AuthUserResponse
}

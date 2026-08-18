import type { Role } from '../types/auth'

const dashboardRoutes: Record<Role, string> = {
  student: '/dashboard/student',
  faculty: '/dashboard/faculty',
  placement_cell: '/dashboard/placement',
  parent: '/dashboard/parent',
  recruiter: '/dashboard/recruiter',
  admin: '/dashboard/admin',
}

export function dashboardRouteForRole(role: Role) {
  return dashboardRoutes[role]
}

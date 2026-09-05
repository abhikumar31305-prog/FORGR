import type { Role } from '../types/auth'

const dashboardRoutes: Record<Role, string> = {
  student: '/student',
  faculty: '/faculty',
  placement_cell: '/placement',
  parent: '/parent',
  recruiter: '/recruiter',
  admin: '/admin',
}

export function dashboardRouteForRole(role: Role) {
  return dashboardRoutes[role]
}

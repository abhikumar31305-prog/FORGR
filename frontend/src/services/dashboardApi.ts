import { apiRequest } from '../api/client'
import type {
  AdminDashboardData,
  FacultyDashboardData,
  ParentDashboardData,
  PlacementDashboardData,
  RecruiterDashboardData,
  StudentDashboardData,
} from '../types/domain'

// ── Backend response shapes (snake_case) ───────────────────────────

interface BackendStudentDashboard {
  attendance_percent: number
  cgpa: number
  backlogs: number
  placement_probability: string
  employability_score: number
  overall_risk: string
  ai_suggestion: string
  academics_trend: Array<{
    semester: number
    cgpa: number
    sgpa: number
    class_rank?: number | null
    backlogs: number
    internal_avg?: number | null
    external_avg?: number | null
  }>
  skills: Array<{ name: string; score: number }>
  portfolio?: { projects: number; certifications: number; github_repositories: number; github_score: number } | null
}

interface BackendAdminDashboard {
  total_students: number
  high_risk_students: number
  low_attendance_students: number
  placement_ready_students: number
  avg_employability?: number
  avg_attendance?: number
  avg_cgpa?: number
  risk_distribution: Array<{ level: string; students: number }>
  alerts: string[]
  student_rows: Array<{
    student_id: string
    name: string
    department: string
    year: number
    overall_risk: string
    attendance_percentage?: number | null
    cgpa?: number | null
    employability_score?: number | null
  }>
}

interface BackendParentDashboard {
  child_name: string
  branch: string
  year: number
  attendance_percent: number
  current_cgpa: number
  risk_level: string
  announcements: string[]
  recommendations: string[]
  academics_trend: Array<{
    semester: number
    cgpa: number
    sgpa: number
    backlogs: number
  }>
  skills: Array<{ name: string; score: number }>
  portfolio?: { projects: number; certifications: number; github_repositories: number; github_score: number } | null
}

interface BackendFacultyDashboard {
  total_students: number
  avg_cgpa: number
  low_attendance_count: number
  high_risk_count: number
  students: Array<{
    student_id: string
    name: string
    department: string
    year: number
    section?: string | null
    cgpa?: number | null
    attendance_percentage?: number | null
    overall_risk: string
    backlogs: number
  }>
  attendance_trend: Array<{ semester: string; avg_attendance: number }>
  skill_averages: Record<string, number>
}

interface BackendPlacementDashboard {
  total_candidates: number
  placed_count: number
  avg_employability: number
  avg_package: number
  candidates: Array<{
    student_id: string
    name: string
    department: string
    year: number
    aptitude_score: number
    resume_score: number
    communication_score: number
    interview_readiness: number
    employability_score: number
    placement_probability: string
    placed: boolean
    package_lpa: number
    coding_score: number
  }>
  probability_distribution: Array<{ level: string; students: number }>
  score_bands: Array<{ band: string; count: number }>
}

interface BackendRecruiterDashboard {
  total_candidates: number
  avg_cgpa: number
  avg_employability: number
  top_skills: Record<string, number>
  candidates: Array<{
    student_id: string
    name: string
    department: string
    year: number
    cgpa?: number | null
    employability_score: number
    coding_score: number
    projects: number
    certifications: number
    github_score: number
    placement_probability: string
    skills: Record<string, number>
  }>
}

// ── API calls with camelCase conversion ─────────────────────────────

export async function getStudentDashboardData(studentId: string): Promise<StudentDashboardData> {
  const raw = await apiRequest<BackendStudentDashboard>(`/dashboard/student/${studentId}`)
  return {
    attendancePercent: raw.attendance_percent,
    cgpa: raw.cgpa,
    backlogs: raw.backlogs,
    placementProbability: raw.placement_probability,
    employabilityScore: raw.employability_score,
    overallRisk: raw.overall_risk,
    aiSuggestion: raw.ai_suggestion,
    academicsTrend: raw.academics_trend,
    skills: raw.skills,
    portfolio: raw.portfolio ?? null,
  }
}

export async function getAdminDashboardData(
  branch?: string,
  year?: number,
): Promise<AdminDashboardData> {
  const params = new URLSearchParams()
  if (branch && branch !== 'all') params.set('branch', branch)
  if (year) params.set('year', String(year))
  const qs = params.toString()

  const raw = await apiRequest<BackendAdminDashboard>(`/dashboard/admin${qs ? `?${qs}` : ''}`)
  return {
    totalStudents: raw.total_students,
    highRiskStudents: raw.high_risk_students,
    lowAttendanceStudents: raw.low_attendance_students,
    placementReadyStudents: raw.placement_ready_students,
    avgEmployability: raw.avg_employability ?? 74,
    avgAttendance: raw.avg_attendance ?? 82,
    avgCgpa: raw.avg_cgpa ?? 7.2,
    riskDistribution: raw.risk_distribution.map((d) => ({
      level: d.level as 'Low' | 'Medium' | 'High',
      students: d.students,
    })),
    alerts: raw.alerts,
    studentRows: raw.student_rows,
  }
}

export async function getParentDashboardData(studentId: string): Promise<ParentDashboardData> {
  const raw = await apiRequest<BackendParentDashboard>(`/dashboard/parent/${studentId}`)
  return {
    childName: raw.child_name,
    branch: raw.branch,
    year: raw.year,
    attendancePercent: raw.attendance_percent,
    currentCgpa: raw.current_cgpa,
    riskLevel: raw.risk_level,
    announcements: raw.announcements,
    recommendations: raw.recommendations,
    academicsTrend: raw.academics_trend,
    skills: raw.skills,
    portfolio: raw.portfolio ?? null,
  }
}

export async function getFacultyDashboardData(
  branch?: string,
  year?: number,
): Promise<FacultyDashboardData> {
  const params = new URLSearchParams()
  if (branch && branch !== 'all') params.set('branch', branch)
  if (year) params.set('year', String(year))
  const qs = params.toString()

  const raw = await apiRequest<BackendFacultyDashboard>(`/dashboard/faculty${qs ? `?${qs}` : ''}`)
  return {
    totalStudents: raw.total_students,
    avgCgpa: raw.avg_cgpa,
    lowAttendanceCount: raw.low_attendance_count,
    highRiskCount: raw.high_risk_count,
    students: raw.students,
    attendanceTrend: raw.attendance_trend,
    skillAverages: raw.skill_averages,
  }
}

export async function getPlacementDashboardData(
  branch?: string,
  year?: number,
): Promise<PlacementDashboardData> {
  const params = new URLSearchParams()
  if (branch && branch !== 'all') params.set('branch', branch)
  if (year) params.set('year', String(year))
  const qs = params.toString()

  const raw = await apiRequest<BackendPlacementDashboard>(`/dashboard/placement${qs ? `?${qs}` : ''}`)
  return {
    totalCandidates: raw.total_candidates,
    placedCount: raw.placed_count,
    avgEmployability: raw.avg_employability,
    avgPackage: raw.avg_package,
    candidates: raw.candidates,
    probabilityDistribution: raw.probability_distribution.map((d) => ({
      level: d.level as 'Low' | 'Medium' | 'High',
      students: d.students,
    })),
    scoreBands: raw.score_bands,
  }
}

export async function getRecruiterDashboardData(
  branch?: string,
  minCgpa?: number,
  minEmployability?: number,
): Promise<RecruiterDashboardData> {
  const params = new URLSearchParams()
  if (branch && branch !== 'all') params.set('branch', branch)
  if (minCgpa) params.set('min_cgpa', String(minCgpa))
  if (minEmployability) params.set('min_employability', String(minEmployability))
  const qs = params.toString()

  const raw = await apiRequest<BackendRecruiterDashboard>(`/dashboard/recruiter${qs ? `?${qs}` : ''}`)
  return {
    totalCandidates: raw.total_candidates,
    avgCgpa: raw.avg_cgpa,
    avgEmployability: raw.avg_employability,
    topSkills: raw.top_skills,
    candidates: raw.candidates,
  }
}

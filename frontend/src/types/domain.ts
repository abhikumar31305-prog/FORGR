export interface Student {
  id: number
  student_id: string
  roll_no?: string | null
  name: string
  gender?: string | null
  email: string
  phone?: string | null
  department: string
  year: number
  semester?: number | null
  section?: string | null
}

export type RiskLevel = 'Low' | 'Medium' | 'High'

export interface TrendPoint {
  label: string
  value: number
}

export interface SkillPoint {
  name: string
  score: number
}

export interface SkillProgress {
  name: string
  score: number
}

// ── Granular data records ───────────────────────────────────────────

export interface AcademicRecord {
  semester: number
  cgpa: number
  sgpa: number
  class_rank?: number | null
  backlogs: number
  internal_avg?: number | null
  external_avg?: number | null
}

export interface AttendanceRecord {
  semester: number
  attendance_percentage: number
  classes_attended?: number | null
  classes_conducted?: number | null
  low_attendance: boolean
}

export interface SkillRecord {
  python: number
  java: number
  sql: number
  machine_learning: number
  data_science: number
  communication: number
  coding_score: number
}

export interface PlacementRecord {
  aptitude_score: number
  resume_score: number
  communication_score: number
  interview_readiness: number
  employability_score: number
  placement_probability: string
  placed: boolean
  package_lpa: number
}

export interface PortfolioRecord {
  projects: number
  certifications: number
  github_repositories: number
  github_score: number
}

export interface RiskRecord {
  backlog_risk: string
  attendance_risk: string
  placement_risk: string
  overall_risk: string
  ai_suggestion?: string | null
}

// ── Dashboard data shapes ──────────────────────────────────────────

export interface StudentDashboardData {
  attendancePercent: number
  cgpa: number
  backlogs: number
  placementProbability: string
  employabilityScore: number
  overallRisk: string
  aiSuggestion: string
  academicsTrend: AcademicRecord[]
  skills: SkillPoint[]
  portfolio?: PortfolioRecord | null
}

export interface RiskDistributionItem {
  level: RiskLevel
  students: number
}

export interface StudentTableRow {
  student_id: string
  name: string
  department: string
  year: number
  overall_risk: string
  attendance_percentage?: number | null
  cgpa?: number | null
  employability_score?: number | null
}

export interface AdminDashboardData {
  totalStudents: number
  highRiskStudents: number
  lowAttendanceStudents: number
  placementReadyStudents: number
  riskDistribution: RiskDistributionItem[]
  alerts: string[]
  studentRows: StudentTableRow[]
}

export interface ParentDashboardData {
  childName: string
  branch: string
  year: number
  attendancePercent: number
  currentCgpa: number
  riskLevel: string
  announcements: string[]
  recommendations: string[]
  academicsTrend: AcademicRecord[]
  skills: SkillPoint[]
  portfolio?: PortfolioRecord | null
}

// ── Faculty dashboard ──────────────────────────────────────────────

export interface FacultyStudentRow {
  student_id: string
  name: string
  department: string
  year: number
  section?: string | null
  cgpa?: number | null
  attendance_percentage?: number | null
  overall_risk: string
  backlogs: number
}

export interface FacultyDashboardData {
  totalStudents: number
  avgCgpa: number
  lowAttendanceCount: number
  highRiskCount: number
  students: FacultyStudentRow[]
  attendanceTrend: Array<{ semester: string; avg_attendance: number }>
  skillAverages: Record<string, number>
}

// ── Placement dashboard ────────────────────────────────────────────

export interface PlacementCandidateRow {
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
}

export interface PlacementDashboardData {
  totalCandidates: number
  placedCount: number
  avgEmployability: number
  avgPackage: number
  candidates: PlacementCandidateRow[]
  probabilityDistribution: RiskDistributionItem[]
  scoreBands: Array<{ band: string; count: number }>
}

// ── Recruiter dashboard ────────────────────────────────────────────

export interface RecruiterCandidateRow {
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
}

export interface RecruiterDashboardData {
  totalCandidates: number
  avgCgpa: number
  avgEmployability: number
  topSkills: Record<string, number>
  candidates: RecruiterCandidateRow[]
}

// ── Student profile (existing) ─────────────────────────────────────

export interface StudentProfile {
  studentId: string
  studentName: string
  email: string
  department: string
  year: number
  reportSummary: string
  attendancePercent: number
  marks: Record<string, number>
  skills: SkillProgress[]
  resumeSummary: string
  resumeLink: string
  leetcodeProgress: string
  leetcodeSolved: number
  leetcodeRating: number
  projectHighlights: string[]
  mentorNotes: string[]
  parentNotes: string[]
  cgpa: number
  backlogs: number
  overallRisk: RiskLevel
  placementProbability: RiskLevel
}

export interface StudentProfileUpdate {
  attendancePercent?: number
  marks?: Record<string, number>
  skills?: SkillProgress[]
  resumeSummary?: string
  resumeLink?: string
  leetcodeProgress?: string
  leetcodeSolved?: number
  leetcodeRating?: number
  projectHighlights?: string[]
  mentorNotes?: string[]
  parentNotes?: string[]
  cgpa?: number
  backlogs?: number
  overallRisk?: RiskLevel
  placementProbability?: RiskLevel
}

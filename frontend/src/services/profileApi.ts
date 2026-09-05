import { apiRequest } from '../api/client'
import type { StudentProfile, StudentProfileUpdate } from '../types/domain'

interface BackendSkillProgress {
  name: string
  score: number
}

interface BackendStudentProfile {
  student_id: string
  student_name: string
  email: string
  department: string
  year: number
  report_summary: string
  attendance_percent: number
  marks: Record<string, number>
  skills: BackendSkillProgress[]
  resume_summary: string
  resume_link: string
  leetcode_progress: string
  leetcode_solved: number
  leetcode_rating: number
  project_highlights: string[]
  mentor_notes: string[]
  parent_notes: string[]
  cgpa: number
  backlogs: number
  overall_risk: StudentProfile['overallRisk']
  placement_probability: StudentProfile['placementProbability']
}

function toStudentProfile(data: BackendStudentProfile): StudentProfile {
  return {
    studentId: data.student_id,
    studentName: data.student_name,
    email: data.email,
    department: data.department,
    year: data.year,
    reportSummary: data.report_summary,
    attendancePercent: data.attendance_percent,
    marks: data.marks,
    skills: data.skills,
    resumeSummary: data.resume_summary,
    resumeLink: data.resume_link,
    leetcodeProgress: data.leetcode_progress,
    leetcodeSolved: data.leetcode_solved,
    leetcodeRating: data.leetcode_rating,
    projectHighlights: data.project_highlights ?? [],
    mentorNotes: data.mentor_notes ?? [],
    parentNotes: data.parent_notes ?? [],
    cgpa: data.cgpa,
    backlogs: data.backlogs,
    overallRisk: data.overall_risk,
    placementProbability: data.placement_probability,
  }
}

export async function getStudentProfile(studentId: string): Promise<StudentProfile> {
  const data = await apiRequest<BackendStudentProfile>(`/students/${studentId}/profile`)
  return toStudentProfile(data)
}

export async function updateStudentProfile(
  studentId: string,
  payload: StudentProfileUpdate,
): Promise<StudentProfile> {
  const data = await apiRequest<BackendStudentProfile>(`/students/${studentId}/profile`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

  return toStudentProfile(data)
}

export async function uploadStudentResume(studentId: string, file: File): Promise<{ resume_link: string; file_name: string; size: number }> {
  const formData = new FormData()
  formData.append('file', file)
  return apiRequest(`/students/${studentId}/resume`, {
    method: 'POST',
    body: formData,
  })
}

export async function getStudentReportCard(studentId: string): Promise<StudentProfile> {
  const data = await apiRequest<BackendStudentProfile>(`/students/${studentId}/report-card`)
  return toStudentProfile(data)
}
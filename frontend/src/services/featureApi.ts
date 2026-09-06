import { apiRequest } from '../api/client'
import type {
  AcademicRecord,
  AttendanceRecord,
  PlacementRecord,
  PortfolioRecord,
  RiskRecord,
  SkillRecord,
} from '../types/domain'

export async function getAcademics(studentId: string): Promise<AcademicRecord[]> {
  return apiRequest<AcademicRecord[]>(`/students/${studentId}/academics`)
}

export async function updateAcademics(
  studentId: string,
  payload: Partial<AcademicRecord>,
): Promise<AcademicRecord> {
  return apiRequest<AcademicRecord>(`/students/${studentId}/academics`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function getAttendance(studentId: string): Promise<AttendanceRecord[]> {
  return apiRequest<AttendanceRecord[]>(`/students/${studentId}/attendance`)
}

export async function updateAttendance(
  studentId: string,
  payload: Partial<AttendanceRecord>,
): Promise<AttendanceRecord> {
  return apiRequest<AttendanceRecord>(`/students/${studentId}/attendance`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function getSkills(studentId: string): Promise<SkillRecord> {
  return apiRequest<SkillRecord>(`/students/${studentId}/skills`)
}

export async function updateSkills(
  studentId: string,
  payload: Partial<SkillRecord>,
): Promise<SkillRecord> {
  return apiRequest<SkillRecord>(`/students/${studentId}/skills`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function getPlacement(studentId: string): Promise<PlacementRecord> {
  return apiRequest<PlacementRecord>(`/students/${studentId}/placement`)
}

export async function updatePlacement(
  studentId: string,
  payload: Partial<PlacementRecord>,
): Promise<PlacementRecord> {
  return apiRequest<PlacementRecord>(`/students/${studentId}/placement`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function getPortfolio(studentId: string): Promise<PortfolioRecord> {
  return apiRequest<PortfolioRecord>(`/students/${studentId}/portfolio`)
}

export async function updatePortfolio(
  studentId: string,
  payload: Partial<PortfolioRecord>,
): Promise<PortfolioRecord> {
  return apiRequest<PortfolioRecord>(`/students/${studentId}/portfolio`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function getRisk(studentId: string): Promise<RiskRecord> {
  return apiRequest<RiskRecord>(`/students/${studentId}/risk`)
}

export async function updateRisk(
  studentId: string,
  payload: Partial<RiskRecord>,
): Promise<RiskRecord> {
  return apiRequest<RiskRecord>(`/students/${studentId}/risk`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export interface AiGuidanceRoadmap {
  student_id: string
  student_name: string
  overall_risk: string
  focus_area: string
  roadmap: Array<{
    week: string
    title: string
    tasks: string[]
    target_metric: string
    status: string
  }>
  estimated_risk_reduction: string
  confidence_score: number
  summary_recommendation: string
}

export interface RiskSimulationPayload {
  attendance_percentage: number
  cgpa: number
  backlogs: number
  coding_score: number
  projects: number
  python: number
  communication: number
}

export interface RiskSimulationResult {
  projected_risk: string
  probabilities: Record<string, number>
  projected_employability_score: number
  projected_placement_probability: string
  interventions: string[]
  debarment_risk: string
}

export async function generateAiGuidance(
  studentId: string,
  focusArea: string = 'all',
): Promise<AiGuidanceRoadmap> {
  return apiRequest<AiGuidanceRoadmap>('/api/backlog/guidance', {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId, focus_area: focusArea }),
  })
}

export async function simulateRiskOutcome(
  payload: RiskSimulationPayload,
): Promise<RiskSimulationResult> {
  return apiRequest<RiskSimulationResult>('/api/backlog/simulate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export interface MlRiskDetails {
  input_features?: {
    attendance_percentage?: number
    cgpa?: number
    backlogs?: number
    coding_score?: number
    projects?: number
    [key: string]: unknown
  }
  probabilities?: {
    High?: number
    Medium?: number
    Low?: number
    [key: string]: unknown
  }
  [key: string]: unknown
}

export async function getBacklogPrediction(studentId: string): Promise<MlRiskDetails> {
  return apiRequest<MlRiskDetails>(`/api/backlog/student/${studentId}`)
}

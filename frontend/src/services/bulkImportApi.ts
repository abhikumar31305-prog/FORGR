import { apiRequest, getEffectiveAccessToken } from '../api/client'

export interface CohortAnalysisReport {
  cohort_health: string
  total_students: number
  total_database_students?: number
  mode?: 'append' | 'replace' | 'refresh' | string
  newly_added?: number
  updated_existing?: number
  risk_distribution: {
    Low: number
    Medium: number
    High: number
  }
  avg_cgpa: number
  avg_attendance: number
  avg_employability: number
  placement_readiness_pct: number
  dropout_risk_count: number
  low_attendance_count: number
  students_with_backlogs: number
  department_distribution?: Record<string, number>
  urgent_actions: string[]
  critical_student_ids: string[]
}

export interface BulkImportResponse {
  batch_id: string
  imported: number
  total_rows: number
  errors: string[]
  status: 'success' | 'completed_with_errors' | 'completed_with_warnings'
  message?: string
  analysis_report?: CohortAnalysisReport
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export type BulkDatasetType =
  | 'unified'
  | 'students'
  | 'academics'
  | 'attendance'
  | 'skills'
  | 'placement'
  | 'portfolio'
  | 'risk'

export interface ImportValidationError {
  row_number: number
  student_id?: string
  field: string
  invalid_value?: string
  error_reason: string
  suggested_correction: string
  severity: 'error' | 'warning' | 'duplicate'
}

export interface ColumnMappingItem {
  detected_column: string
  mapped_field: string
  status: 'valid' | 'optional' | 'unmapped' | 'custom'
}

export interface ImportPreviewResponse {
  total_rows: number
  valid_rows: number
  warning_rows: number
  error_rows: number
  duplicate_rows: number
  columns_detected: string[]
  mappings: ColumnMappingItem[]
  preview_records: Record<string, unknown>[]
  validation_errors: ImportValidationError[]
  can_import: boolean
}

export interface ImportHistoryRecord {
  id: number
  import_batch_id: string
  admin_email: string
  dataset_type: string
  import_mode: string
  file_name: string
  total_rows: number
  inserted_rows: number
  updated_rows: number
  skipped_rows: number
  failed_rows: number
  status: string
  created_at: string
}

export interface AuditLogEntry {
  id: number
  table_name: string
  student_id?: string
  user_email: string
  action: string
  field_changed?: string
  old_value?: string
  new_value?: string
  created_at: string
}

export async function uploadBulkDataset(
  datasetType: BulkDatasetType,
  file: File,
  replaceExisting: boolean = false,
): Promise<BulkImportResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const qs = `?replace_existing=${replaceExisting}`
  return apiRequest<BulkImportResponse>(`/api/bulk-import/${datasetType}${qs}`, {
    method: 'POST',
    body: formData,
  })
}

export async function detectAndValidateImport(
  file: File,
  datasetType: string,
): Promise<ImportPreviewResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('dataset_type', datasetType)

  return apiRequest<ImportPreviewResponse>('/api/bulk-import/detect-and-validate', {
    method: 'POST',
    body: formData,
  })
}

export async function executeImportWorkflow(
  file: File,
  datasetType: string,
  importMode: 'create' | 'update' | 'upsert' | 'replace',
  replaceConfirmed: boolean = false,
  mappingsJson?: string,
): Promise<{
  batch_id: string
  dataset_type: string
  import_mode: string
  total_rows: number
  inserted: number
  updated: number
  skipped: number
  failed: number
  status: string
  message: string
  analysis_report?: CohortAnalysisReport
}> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('dataset_type', datasetType)
  formData.append('import_mode', importMode)
  formData.append('replace_confirmed', String(replaceConfirmed))
  if (mappingsJson) {
    formData.append('mappings_json', mappingsJson)
  }

  return apiRequest('/api/bulk-import/execute-import', {
    method: 'POST',
    body: formData,
  })
}

export async function getImportHistory(limit: number = 50): Promise<ImportHistoryRecord[]> {
  return apiRequest<ImportHistoryRecord[]>(`/api/bulk-import/history?limit=${limit}`)
}

export async function getImportBatchErrors(batchId: string): Promise<{
  batch_id: string
  file_name: string
  status: string
  failed_rows: number
  errors: unknown[]
}> {
  return apiRequest(`/api/bulk-import/history/${batchId}/errors`)
}

export async function downloadImportErrorReport(batchId: string) {
  const path = `/api/bulk-import/history/${batchId}/errors/download`
  const response = await fetch(API_BASE_URL ? `${API_BASE_URL}${path}` : path, {
    headers: { Authorization: `Bearer ${getEffectiveAccessToken()}` },
  })
  if (!response.ok) {
    throw new Error('Unable to download the import error report.')
  }

  const objectUrl = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = `forgr_import_errors_${batchId}.csv`
  link.click()
  URL.revokeObjectURL(objectUrl)
}

export async function getAdminAuditLogs(
  limit: number = 100,
  action?: string,
  tableName?: string,
  search?: string,
): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (action && action !== 'all') params.append('action', action)
  if (tableName && tableName !== 'all') params.append('table_name', tableName)
  if (search) params.append('search', search)
  return apiRequest<AuditLogEntry[]>(`/api/admin/audit-logs?${params.toString()}`)
}

export async function syncBenchmarkDataset(replaceExisting: boolean = true): Promise<BulkImportResponse> {
  const qs = `?replace_existing=${replaceExisting}`
  return apiRequest<BulkImportResponse>(`/api/bulk-import/sync-benchmark${qs}`, {
    method: 'POST',
  })
}

export async function recalculateSystemAnalytics(): Promise<BulkImportResponse> {
  return apiRequest<BulkImportResponse>('/api/bulk-import/recalculate-analytics', {
    method: 'POST',
  })
}

export function downloadTemplateCsv(datasetType: string) {
  const url = `${API_BASE_URL}/api/bulk-import/templates/${datasetType}`
  window.open(url, '_blank')
}


import { useState, useRef, type ChangeEvent, type DragEvent } from 'react'
import {
  uploadBulkDataset,
  syncBenchmarkDataset,
  recalculateSystemAnalytics,
  downloadTemplateCsv,
  type BulkImportResponse,
} from '../../services/bulkImportApi'

type DatasetType = 'unified' | 'students' | 'academics' | 'attendance' | 'skills' | 'placement' | 'portfolio'
type ImportMode = 'append' | 'replace'

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userRole?: 'admin' | 'faculty' | 'placement_cell' | string
}

const DATASET_INFO: Record<DatasetType, { title: string; desc: string; sampleCols: string[]; adminOnly?: boolean }> = {
  unified: {
    title: 'Master Cohort (All-in-One)',
    desc: 'Full cohort dataset with student profiles, academics, attendance, skills, portfolio, and placement metrics.',
    sampleCols: ['student_id', 'name', 'email', 'department', 'year', 'cgpa', 'backlogs', 'attendance_percentage', 'coding_score', 'python', 'communication'],
    adminOnly: true,
  },
  students: {
    title: 'Student Roster',
    desc: 'Upload student profile records. Auto-provisions user login accounts with credentials.',
    sampleCols: ['student_id', 'name', 'email', 'department', 'year', 'semester', 'roll_no', 'gender', 'phone', 'section'],
    adminOnly: true,
  },
  academics: {
    title: 'Academic Marks & CGPA',
    desc: 'Update semester-wise academic performance and backlog records. Triggers backlog risk models.',
    sampleCols: ['student_id', 'semester', 'cgpa', 'sgpa', 'backlogs', 'class_rank', 'internal_avg', 'external_avg'],
  },
  attendance: {
    title: 'Attendance Sheets',
    desc: 'Update semester attendance percentage and class counts. Triggers low attendance & dropout alerts.',
    sampleCols: ['student_id', 'semester', 'attendance_percentage', 'classes_attended', 'classes_conducted'],
  },
  skills: {
    title: 'Technical & Soft Skills',
    desc: 'Update student coding scores and language proficiencies. Updates employability & career fit.',
    sampleCols: ['student_id', 'coding_score', 'python', 'java', 'sql', 'machine_learning', 'data_science', 'communication'],
  },
  placement: {
    title: 'Placement & Drives',
    desc: 'Update aptitude, interview readiness, salary package, and placement status.',
    sampleCols: ['student_id', 'aptitude_score', 'resume_score', 'communication_score', 'interview_readiness', 'package_lpa', 'placed'],
  },
  portfolio: {
    title: 'Portfolio & GitHub',
    desc: 'Update projects completed, certifications, and GitHub activity scores.',
    sampleCols: ['student_id', 'projects', 'certifications', 'github_repositories', 'github_score'],
  },
}

export function BulkImportModal({ isOpen, onClose, onSuccess, userRole = 'admin' }: BulkImportModalProps) {
  const isAdmin = userRole === 'admin'
  const defaultType: DatasetType = isAdmin ? 'unified' : 'academics'
  const [datasetType, setDatasetType] = useState<DatasetType>(defaultType)
  const [importMode, setImportMode] = useState<ImportMode>('append')
  const [file, setFile] = useState<File | null>(null)
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSyncingBenchmark, setIsSyncingBenchmark] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<BulkImportResponse | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const allowedTypes = (Object.keys(DATASET_INFO) as DatasetType[]).filter(
    (type) => isAdmin || !DATASET_INFO[type].adminOnly,
  )

  const parsePreview = (uploadedFile: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (!text) return
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
      if (lines.length > 0) {
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
        setPreviewHeaders(headers)
        const sample = lines.slice(1, 6).map((line) => line.split(',').map((c) => c.trim().replace(/^"|"$/g, '')))
        setPreviewRows(sample)
      }
    }
    reader.readAsText(uploadedFile)
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      if (!selected.name.endsWith('.csv')) {
        setError('Only .csv files are supported.')
        return
      }
      setError('')
      setResult(null)
      setFile(selected)
      parsePreview(selected)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) {
      if (!dropped.name.endsWith('.csv')) {
        setError('Only .csv files are supported.')
        return
      }
      setError('')
      setResult(null)
      setFile(dropped)
      parsePreview(dropped)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV file first.')
      return
    }

    setIsUploading(true)
    setError('')
    setResult(null)
    const modeLabel = importMode === 'replace' ? 'fresh master dataset replacement' : 'database append & merge'
    setStatusMessage(`Processing ${file.name} in ${modeLabel} mode & executing ML analytics pipeline...`)

    try {
      const replace = isAdmin && importMode === 'replace'
      const res = await uploadBulkDataset(datasetType, file, replace)
      setResult(res)
      setStatusMessage('Data ingested & system-wide analytics successfully computed!')
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSyncBenchmark = async () => {
    setIsSyncingBenchmark(true)
    setError('')
    setResult(null)
    const replace = importMode === 'replace'
    setStatusMessage(
      replace
        ? 'Purging database and extracting 5,000 student benchmark dataset as fresh cohort...'
        : 'Appending 5,000 student benchmark dataset into existing institutional database...',
    )

    try {
      const res = await syncBenchmarkDataset(replace)
      setResult(res)
      setStatusMessage('Master benchmark dataset synchronized and system-wide analytics updated!')
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Benchmark dataset sync failed.')
    } finally {
      setIsSyncingBenchmark(false)
    }
  }

  const handleRecalculateAnalytics = async () => {
    setIsRecalculating(true)
    setError('')
    setStatusMessage('Executing real-time ML risk & placement models across all active database records...')

    try {
      const res = await recalculateSystemAnalytics()
      setResult(res)
      setStatusMessage('Institutional analytics and operational action directives successfully recomputed!')
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analytics recalculation failed.')
    } finally {
      setIsRecalculating(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setPreviewRows([])
    setPreviewHeaders([])
    setError('')
    setResult(null)
    setStatusMessage('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const analysis = result?.analysis_report

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 12, 16, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          background: 'var(--card-bg, #1D1F23)',
          border: '1px solid var(--line, #303237)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 840,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--line, #303237)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: isAdmin ? 'var(--ember-wash, rgba(255,90,40,0.12))' : 'var(--tempered-wash, rgba(95,168,196,0.12))',
                color: isAdmin ? 'var(--ember, #FF5A28)' : 'var(--tempered, #5FA8C4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, color: 'var(--off-white, #ECEAE5)' }}>
                {isAdmin ? 'Admin Data Hub: Bulk Ingestion & Automated ML Analytics' : 'Faculty Data Hub: Bulk Update Student Records'}
              </h3>
              <div style={{ fontSize: 12, color: 'var(--grey, #8B8D93)', marginTop: 2 }}>
                {isAdmin
                  ? 'Append records at will or replace dataset with instant system-wide ML risk & placement analytics'
                  : 'Update academic marks, attendance, and skills for existing enrolled students'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--grey, #8B8D93)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'grid', gap: 18 }}>
          {/* Permission Notice */}
          {!isAdmin && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--tempered-wash, rgba(95,168,196,0.1))',
                border: '1px solid var(--tempered, #5FA8C4)',
                fontSize: 12,
                color: 'var(--off-white, #ECEAE5)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>ℹ️</span>
              <span>
                <strong>Faculty Permission Notice:</strong> You can update marks, attendance, and skills for existing students. Creating new student rosters is restricted to Administrators.
              </span>
            </div>
          )}

          {/* 1. Action / Dataset Category */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--grey, #8B8D93)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              1. Select Action / Dataset Category
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(140px, 1fr))`, gap: 8, marginTop: 8 }}>
              {allowedTypes.map((type) => {
                const active = datasetType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setDatasetType(type)
                      handleReset()
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: active ? '1.5px solid var(--ember, #FF5A28)' : '1px solid var(--line, #303237)',
                      background: active ? 'var(--ember-wash, rgba(255,90,40,0.14))' : 'var(--steel, #1D1F23)',
                      color: active ? 'var(--ember, #FF5A28)' : 'var(--off-white, #ECEAE5)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {DATASET_INFO[type].title}
                  </button>
                )
              })}
            </div>
            <div style={{ fontSize: 12, color: 'var(--grey, #8B8D93)', marginTop: 8, lineHeight: 1.4 }}>
              {DATASET_INFO[datasetType].desc}
            </div>
          </div>

          {/* 2. Database Ingestion Mode Selector (Admin Only) */}
          {isAdmin && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--grey, #8B8D93)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  2. Choose Database Ingestion Mode
                </label>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: importMode === 'append' ? 'var(--patina, #5FA37F)' : 'var(--ember, #FF5A28)',
                  }}
                >
                  {importMode === 'append' ? '● Append Mode Active' : '⚠️ Overwrite Mode Active'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Append Option */}
                <div
                  onClick={() => setImportMode('append')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: importMode === 'append' ? '2px solid var(--patina, #5FA37F)' : '1px solid var(--line, #303237)',
                    background: importMode === 'append' ? 'rgba(95, 163, 127, 0.12)' : 'var(--steel, #1D1F23)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: importMode === 'append' ? 'var(--patina, #5FA37F)' : 'var(--off-white, #ECEAE5)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>➕</span> Append to Existing Database
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'rgba(95, 163, 127, 0.2)',
                        color: 'var(--patina, #5FA37F)',
                        fontWeight: 700,
                      }}
                    >
                      RECOMMENDED
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--grey, #8B8D93)', marginTop: 6, lineHeight: 1.4 }}>
                    Preserves current database. Appends new students and updates matching records with full ML evaluation across all students.
                  </div>
                </div>

                {/* Replace Option */}
                <div
                  onClick={() => setImportMode('replace')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: importMode === 'replace' ? '2px solid var(--ember, #FF5A28)' : '1px solid var(--line, #303237)',
                    background: importMode === 'replace' ? 'rgba(255, 90, 40, 0.12)' : 'var(--steel, #1D1F23)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: importMode === 'replace' ? 'var(--ember, #FF5A28)' : 'var(--off-white, #ECEAE5)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>🔄</span> Replace with Entire New Dataset
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'rgba(255, 90, 40, 0.2)',
                        color: 'var(--ember, #FF5A28)',
                        fontWeight: 700,
                      }}
                    >
                      FRESH COHORT
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--grey, #8B8D93)', marginTop: 6, lineHeight: 1.4 }}>
                    Purges previous student records and populates the database afresh with this uploaded dataset as the master cohort.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1-Click Server-Side Master Benchmark Ingestion Card */}
          {isAdmin && datasetType === 'unified' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(255, 90, 40, 0.12) 0%, rgba(95, 168, 196, 0.08) 100%)',
                border: '1.5px solid var(--ember, #FF5A28)',
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--off-white, #ECEAE5)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>⚡</span> 1-Click Load Full Institutional Dataset (5,000 Students)
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey, #8B8D93)', marginTop: 4 }}>
                  Ingests all 52+ multi-domain attributes from server-side master CSV (`combined_student_data_different.csv`).
                  {' Mode: '}
                  <strong style={{ color: importMode === 'append' ? 'var(--patina, #5FA37F)' : 'var(--ember, #FF5A28)' }}>
                    {importMode === 'append' ? 'Append to Existing DB' : 'Replace Entire DB'}
                  </strong>
                </div>
              </div>
              <button
                type="button"
                disabled={isSyncingBenchmark || isUploading || isRecalculating}
                onClick={handleSyncBenchmark}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--ember, #FF5A28)',
                  color: '#FFFFFF',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: isSyncingBenchmark || isUploading || isRecalculating ? 'not-allowed' : 'pointer',
                  opacity: isSyncingBenchmark || isUploading || isRecalculating ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(255, 90, 40, 0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSyncingBenchmark ? (
                  <>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    {importMode === 'append' ? 'Append Master (5,000)' : 'Replace With Master (5,000)'}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Template Download Section */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 10,
              background: 'var(--steel-2, #232529)',
              border: '1px solid var(--line, #303237)',
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--off-white, #ECEAE5)' }}>
                Required Columns for {DATASET_INFO[datasetType].title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--grey, #8B8D93)', marginTop: 2 }}>
                {DATASET_INFO[datasetType].sampleCols.join(', ')}
              </div>
            </div>
            <button
              type="button"
              onClick={() => downloadTemplateCsv(datasetType)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 6,
                border: '1px solid var(--line, #303237)',
                background: 'var(--steel-3, #2A2D32)',
                color: 'var(--off-white, #ECEAE5)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Sample CSV
            </button>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--grey, #8B8D93)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              3. Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              style={{
                marginTop: 8,
                border: `2px dashed ${isDragging ? 'var(--ember, #FF5A28)' : file ? 'var(--patina, #5FA37F)' : 'var(--line, #303237)'}`,
                borderRadius: 12,
                padding: '22px 20px',
                textAlign: 'center',
                background: isDragging ? 'var(--ember-wash, rgba(255,90,40,0.08))' : 'var(--steel, #1D1F23)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="32"
                height="32"
                fill="none"
                stroke={file ? 'var(--patina, #5FA37F)' : 'var(--grey, #8B8D93)'}
                strokeWidth="1.6"
                style={{ margin: '0 auto 8px' }}
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              {file ? (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--patina, #5FA37F)' }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grey, #8B8D93)', marginTop: 4 }}>
                    {(file.size / 1024).toFixed(1)} KB — Mode:{' '}
                    <span style={{ fontWeight: 700, color: importMode === 'append' ? 'var(--patina)' : 'var(--ember)' }}>
                      {isAdmin ? (importMode === 'append' ? 'Append & Merge' : 'Replace Entire DB') : 'Append Records'}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--off-white, #ECEAE5)' }}>
                    Drop your CSV file here, or <span style={{ color: 'var(--ember, #FF5A28)' }}>browse</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--grey, #8B8D93)', marginTop: 4 }}>
                    Supports UTF-8 encoded .csv files up to 20MB
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Preview Table */}
          {previewHeaders.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--grey, #8B8D93)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Data Preview (First 5 Rows)
                </span>
                <span style={{ fontSize: 11, color: 'var(--grey, #8B8D93)' }}>
                  {previewHeaders.length} columns detected
                </span>
              </div>
              <div
                style={{
                  maxHeight: 140,
                  overflowX: 'auto',
                  overflowY: 'auto',
                  border: '1px solid var(--line, #303237)',
                  borderRadius: 8,
                  background: 'var(--steel, #1D1F23)',
                }}
              >
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--steel-2, #232529)', color: 'var(--grey, #8B8D93)' }}>
                      {previewHeaders.map((h, i) => (
                        <th key={i} style={{ padding: '6px 10px', borderBottom: '1px solid var(--line, #303237)', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, rIdx) => (
                      <tr key={rIdx} style={{ borderBottom: '1px solid var(--line-soft, #2A2C31)', color: 'var(--off-white, #ECEAE5)' }}>
                        {row.map((val, cIdx) => (
                          <td key={cIdx} style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                background: 'rgba(255, 90, 40, 0.12)',
                border: '1px solid var(--ember, #FF5A28)',
                color: 'var(--ember, #FF5A28)',
                fontSize: 13,
              }}
            >
              <strong>Error: </strong> {error}
            </div>
          )}

          {/* Comprehensive Cohort Analysis & Operational Actions Report */}
          {result && (
            <div
              style={{
                display: 'grid',
                gap: 14,
                padding: '18px 20px',
                borderRadius: 12,
                background: 'var(--steel-2, #232529)',
                border: `1px solid ${result.status === 'success' ? 'var(--patina, #5FA37F)' : 'var(--amber, #E8A23D)'}`,
              }}
            >
              {/* Status Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={result.status === 'success' ? 'var(--patina, #5FA37F)' : 'var(--amber, #E8A23D)'} strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span style={{ fontSize: 15, fontWeight: 700, color: result.status === 'success' ? 'var(--patina, #5FA37F)' : 'var(--amber, #E8A23D)' }}>
                    {result.message || `Processed ${result.imported} of ${result.total_rows} records`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {analysis?.mode && (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        background: analysis.mode === 'replace' ? 'rgba(255, 90, 40, 0.2)' : 'rgba(95, 163, 127, 0.2)',
                        color: analysis.mode === 'replace' ? 'var(--ember, #FF5A28)' : 'var(--patina, #5FA37F)',
                        border: `1px solid ${analysis.mode === 'replace' ? 'var(--ember, #FF5A28)' : 'var(--patina, #5FA37F)'}`,
                      }}
                    >
                      {analysis.mode === 'replace' ? 'Fresh Dataset Overwrite' : analysis.mode === 'refresh' ? 'Live Recalculated' : 'Appended to DB'}
                    </span>
                  )}
                  {analysis && (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        background: analysis.cohort_health === 'Optimal' ? 'rgba(95, 163, 127, 0.2)' : 'rgba(255, 90, 40, 0.2)',
                        color: analysis.cohort_health === 'Optimal' ? 'var(--patina, #5FA37F)' : 'var(--ember, #FF5A28)',
                        border: `1px solid ${analysis.cohort_health === 'Optimal' ? 'var(--patina, #5FA37F)' : 'var(--ember, #FF5A28)'}`,
                      }}
                    >
                      Cohort Health: {analysis.cohort_health}
                    </span>
                  )}
                </div>
              </div>

              {/* Ingestion Breakdown Tag */}
              {analysis && (analysis.newly_added !== undefined || analysis.updated_existing !== undefined) && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--off-white, #ECEAE5)',
                    background: 'var(--graphite, #17181B)',
                    padding: '8px 12px',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <span>
                    <strong>Newly Added to DB:</strong>{' '}
                    <span style={{ color: 'var(--patina, #5FA37F)', fontWeight: 700 }}>+{analysis.newly_added ?? 0}</span>
                  </span>
                  <span>
                    <strong>Existing Updated:</strong>{' '}
                    <span style={{ color: 'var(--tempered, #5FA8C4)', fontWeight: 700 }}>{analysis.updated_existing ?? 0}</span>
                  </span>
                  <span>
                    <strong>Total Active Database Records:</strong>{' '}
                    <span style={{ color: 'var(--off-white, #ECEAE5)', fontWeight: 800 }}>{analysis.total_database_students ?? analysis.total_students}</span>
                  </span>
                </div>
              )}

              {/* Analysis Metrics Cards */}
              {analysis && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                  <div style={{ background: 'var(--graphite, #17181B)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line, #303237)' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--grey, #8B8D93)', textTransform: 'uppercase' }}>Total DB Size</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--off-white, #ECEAE5)', marginTop: 2 }}>
                      {analysis.total_database_students ?? analysis.total_students}
                    </div>
                  </div>
                  <div style={{ background: 'var(--graphite, #17181B)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line, #303237)' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--grey, #8B8D93)', textTransform: 'uppercase' }}>Avg CGPA</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--off-white, #ECEAE5)', marginTop: 2 }}>
                      {analysis.avg_cgpa.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ background: 'var(--graphite, #17181B)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line, #303237)' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--grey, #8B8D93)', textTransform: 'uppercase' }}>Avg Attendance</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: analysis.avg_attendance < 75 ? 'var(--ember)' : 'var(--patina)', marginTop: 2 }}>
                      {analysis.avg_attendance}%
                    </div>
                  </div>
                  <div style={{ background: 'var(--graphite, #17181B)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line, #303237)' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--grey, #8B8D93)', textTransform: 'uppercase' }}>Employability</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--tempered)', marginTop: 2 }}>
                      {analysis.avg_employability}/100
                    </div>
                  </div>
                  <div style={{ background: 'var(--graphite, #17181B)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line, #303237)' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--grey, #8B8D93)', textTransform: 'uppercase' }}>Placement Ready</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--amber)', marginTop: 2 }}>
                      {analysis.placement_readiness_pct}%
                    </div>
                  </div>
                  <div style={{ background: 'var(--graphite, #17181B)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line, #303237)' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--grey, #8B8D93)', textTransform: 'uppercase' }}>High Risk Flagged</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: analysis.risk_distribution.High > 0 ? 'var(--ember)' : 'var(--patina)', marginTop: 2 }}>
                      {analysis.risk_distribution.High}
                    </div>
                  </div>
                  <div style={{ background: 'var(--graphite, #17181B)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line, #303237)' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--grey, #8B8D93)', textTransform: 'uppercase' }}>Dropout Risk</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: analysis.dropout_risk_count > 0 ? 'var(--ember)' : 'var(--patina)', marginTop: 2 }}>
                      {analysis.dropout_risk_count}
                    </div>
                  </div>
                  <div style={{ background: 'var(--graphite, #17181B)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line, #303237)' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--grey, #8B8D93)', textTransform: 'uppercase' }}>Active Backlogs</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: analysis.students_with_backlogs > 0 ? 'var(--ember)' : 'var(--patina)', marginTop: 2 }}>
                      {analysis.students_with_backlogs}
                    </div>
                  </div>
                </div>
              )}

              {/* Department Distribution Pills */}
              {analysis && analysis.department_distribution && Object.keys(analysis.department_distribution).length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--grey, #8B8D93)' }}>Departments:</span>
                  {Object.entries(analysis.department_distribution).map(([dept, count]) => (
                    <span
                      key={dept}
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: 'var(--graphite, #17181B)',
                        border: '1px solid var(--line, #303237)',
                        color: 'var(--off-white, #ECEAE5)',
                      }}
                    >
                      {dept}: <strong>{count}</strong>
                    </span>
                  ))}
                </div>
              )}

              {/* Automated Operational Directives */}
              {analysis && analysis.urgent_actions.length > 0 && (
                <div style={{ background: 'var(--graphite, #17181B)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--line, #303237)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--off-white, #ECEAE5)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>⚡</span> System-Wide Automated Directives Triggered:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--off-white, #ECEAE5)', display: 'grid', gap: 6 }}>
                    {analysis.urgent_actions.map((act, idx) => (
                      <li key={idx} style={{ lineHeight: 1.4 }}>{act}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Live Recalculate Button */}
              {isAdmin && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                  <button
                    type="button"
                    disabled={isRecalculating || isUploading || isSyncingBenchmark}
                    onClick={handleRecalculateAnalytics}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: '1px solid var(--line, #303237)',
                      background: 'var(--steel-3, #2A2D32)',
                      color: 'var(--off-white, #ECEAE5)',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: isRecalculating ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isRecalculating ? 'Recalculating ML...' : '⚡ Re-evaluate Analytics on Entire Database'}
                  </button>
                </div>
              )}

              {/* Warnings List if any */}
              {result.errors.length > 0 && (
                <div style={{ paddingTop: 6, borderTop: '1px solid var(--line, #303237)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber, #E8A23D)' }}>
                    Row Warnings & Skipped Entries ({result.errors.length}):
                  </div>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: 11, color: 'var(--grey, #8B8D93)' }}>
                    {result.errors.slice(0, 4).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--line, #303237)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--steel-2, #232529)',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--grey, #8B8D93)' }}>
            {isUploading || isSyncingBenchmark || isRecalculating
              ? statusMessage
              : file
                ? `${file.name} ready (${importMode === 'append' ? 'Append Mode' : 'Replace Mode'})`
                : 'Select a CSV file to begin'}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid var(--line, #303237)',
                background: 'transparent',
                color: 'var(--off-white, #ECEAE5)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {result ? 'Done' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={!file || isUploading || isSyncingBenchmark || isRecalculating}
              onClick={handleUpload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px',
                borderRadius: 8,
                border: 'none',
                background: importMode === 'replace' && isAdmin ? 'var(--ember, #FF5A28)' : 'var(--patina, #5FA37F)',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 700,
                cursor: !file || isUploading ? 'not-allowed' : 'pointer',
                opacity: !file || isUploading ? 0.6 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              {isUploading ? (
                <>
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Processing & Analyzing...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {isAdmin
                    ? importMode === 'append'
                      ? 'Append to DB & Run Analytics'
                      : 'Replace Entire DB & Run Analytics'
                    : 'Update Records & Recalculate ML'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef, useId, type ChangeEvent, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  detectAndValidateImport,
  executeImportWorkflow,
  downloadTemplateCsv,
  type BulkDatasetType,
  type ImportPreviewResponse,
  type CohortAnalysisReport,
} from '../../services/bulkImportApi'
import { getSubscriptionStatus, type SubscriptionStatus } from '../../services/billingApi'
import { SectionCard } from '../../components/ui/SectionCard'
import { StatCard } from '../../components/ui/StatCard'

interface CategoryMeta {
  type: BulkDatasetType
  title: string
  subtitle: string
  templateFile: string
  keyCols: string[]
  adminOnly?: boolean
}

const IMPORT_CATEGORIES: CategoryMeta[] = [
  {
    type: 'students',
    title: 'Student Master / Roster',
    subtitle: 'Onboard new students, provision institutional accounts, and seed identity records.',
    templateFile: 'student_master_template.csv',
    keyCols: ['student_id', 'name', 'email', 'department', 'year', 'roll_no', 'semester'],
    adminOnly: true,
  },
  {
    type: 'academics',
    title: 'Academics & Semester Grades',
    subtitle: 'Import semester-wise CGPA, SGPA, class ranks, and backlog counts.',
    templateFile: 'academics_template.csv',
    keyCols: ['student_id', 'semester', 'cgpa', 'sgpa', 'backlogs', 'class_rank'],
  },
  {
    type: 'attendance',
    title: 'Attendance Records',
    subtitle: 'Update student attendance percentages, classes attended, and low attendance flags.',
    templateFile: 'attendance_template.csv',
    keyCols: ['student_id', 'semester', 'attendance_percentage', 'classes_attended', 'classes_conducted'],
  },
  {
    type: 'skills',
    title: 'Skills & Assessments',
    subtitle: 'Synchronize coding scores, language proficiencies, and technical skill benchmarks.',
    templateFile: 'skills_template.csv',
    keyCols: ['student_id', 'coding_score', 'python', 'java', 'sql', 'machine_learning', 'communication'],
  },
  {
    type: 'portfolio',
    title: 'Portfolio & Projects',
    subtitle: 'Synchronize verified project counts, certifications, and GitHub activity scores.',
    templateFile: 'portfolio_template.csv',
    keyCols: ['student_id', 'projects', 'certifications', 'github_repositories', 'github_score'],
  },
  {
    type: 'placement',
    title: 'Placement & Drives',
    subtitle: 'Record aptitude test results, interview readiness, hiring offers, and packages.',
    templateFile: 'placement_template.csv',
    keyCols: ['student_id', 'aptitude_score', 'resume_score', 'interview_readiness', 'package_lpa', 'placed'],
  },
  {
    type: 'risk',
    title: 'Risk & Prediction Overrides',
    subtitle: 'Import academic risk flags, dropout indicators, and AI prescriptive guidance notes.',
    templateFile: 'risk_prediction_template.csv',
    keyCols: ['student_id', 'backlog_risk', 'attendance_risk', 'placement_risk', 'overall_risk', 'ai_suggestion'],
  },
  {
    type: 'unified',
    title: 'Unified Student Dataset',
    subtitle: 'Comprehensive multi-domain cohort dataset synchronizing all 40+ student parameters in 1-click.',
    templateFile: 'unified_student_template.csv',
    keyCols: ['student_id', 'name', 'email', 'department', 'cgpa', 'attendance_percentage', 'coding_score'],
    adminOnly: true,
  },
]

type ImportMode = 'create' | 'update' | 'upsert' | 'replace'

export function AdminBulkImportPage() {
  const [selectedCategory, setSelectedCategory] = useState<BulkDatasetType>('unified')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [validationResult, setValidationResult] = useState<ImportPreviewResponse | null>(null)
  const [customMappings, setCustomMappings] = useState<Record<string, string>>({})
  const [importMode, setImportMode] = useState<ImportMode>('upsert')
  const [replaceConfirmed, setReplaceConfirmed] = useState(false)
  const [finalReport, setFinalReport] = useState<{
    batch_id: string
    total_rows: number
    inserted: number
    updated: number
    skipped: number
    failed: number
    status: string
    message: string
    analysis_report?: CohortAnalysisReport
  } | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null)

  useEffect(() => {
    void getSubscriptionStatus().then(setSubStatus).catch(() => null)
  }, [])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputId = useId()

  const activeCategoryMeta = IMPORT_CATEGORIES.find((c) => c.type === selectedCategory) || IMPORT_CATEGORIES[0]

  const handleFileSelection = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setErrorMessage('Invalid file format. Please upload a standard comma-separated .csv file.')
      return
    }
    if (selectedFile.size > 15 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 15MB limit.')
      return
    }
    setErrorMessage('')
    setFile(selectedFile)
    setValidationResult(null)
    setFinalReport(null)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0])
    }
  }

  const handleValidate = async () => {
    if (!file) {
      setErrorMessage('Please select or drop a CSV file to validate.')
      return
    }
    setIsValidating(true)
    setErrorMessage('')
    try {
      const preview = await detectAndValidateImport(file, selectedCategory)
      setValidationResult(preview)
      const initMap: Record<string, string> = {}
      preview.mappings.forEach((m) => {
        initMap[m.detected_column] = m.mapped_field
      })
      setCustomMappings(initMap)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Validation failed. Please verify file format.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleExecute = async () => {
    if (!file) return
    if (importMode === 'replace' && !replaceConfirmed) {
      setErrorMessage('Replace mode requires explicit confirmation before proceeding.')
      return
    }

    setIsExecuting(true)
    setErrorMessage('')
    try {
      const result = await executeImportWorkflow(
        file,
        selectedCategory,
        importMode,
        replaceConfirmed,
        JSON.stringify(customMappings),
      )
      setFinalReport(result)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Execution failed during database import.')
    } finally {
      setIsExecuting(false)
    }
  }

  const handleDownloadErrorReport = () => {
    if (!validationResult || validationResult.validation_errors.length === 0) return
    const headers = ['Row Number', 'Student ID', 'Field', 'Invalid Value', 'Error Reason', 'Suggested Correction', 'Severity']
    const csvRows = [
      headers.join(','),
      ...validationResult.validation_errors.map((e) =>
        [
          e.row_number,
          `"${(e.student_id || '').replace(/"/g, '""')}"`,
          `"${e.field.replace(/"/g, '""')}"`,
          `"${(e.invalid_value || '').replace(/"/g, '""')}"`,
          `"${e.error_reason.replace(/"/g, '""')}"`,
          `"${e.suggested_correction.replace(/"/g, '""')}"`,
          e.severity,
        ].join(','),
      ),
    ]
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `forgr_import_validation_errors_${selectedCategory}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid stagger" style={{ gap: '1.5rem' }}>
      {/* ── Page Header ── */}
      <header className="dashboard-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="eyebrow">Enterprise Data Ingestion & ML Pipeline</p>
          <h1 className="headline" style={{ fontSize: '2.2rem', margin: '0.2rem 0' }}>Bulk Data Import</h1>
          <p className="subtle" style={{ fontSize: '0.95rem' }}>Add a new dataset or merge updates into the live database.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <Link to="/admin/billing" className="button" style={{ background: 'var(--accent)', color: '#FFFFFF', fontWeight: 700, borderRadius: '8px', border: 'none', padding: '0.5rem 1.1rem' }}>
            💳 Billing & Plans
          </Link>
          <Link to="/admin/import-history" className="button" style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--text)', borderRadius: '8px', padding: '0.5rem 1.1rem' }}>
            📋 Import History
          </Link>
        </div>
      </header>

      {/* ── Institutional Subscription & Quota Banner ── */}
      {subStatus && (
        <div style={{
          background: 'linear-gradient(165deg, #202226 0%, #17181B 100%)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '1.1rem 1.4rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: subStatus.status === 'active' ? 'rgba(95, 163, 127, 0.18)' : subStatus.status === 'trialing' ? 'rgba(232, 162, 61, 0.18)' : 'rgba(255, 90, 40, 0.18)',
                  color: subStatus.status === 'active' ? '#6fc797' : subStatus.status === 'trialing' ? '#f2a93b' : '#ff6b57',
                  border: `1px solid ${subStatus.status === 'active' ? 'rgba(95, 163, 127, 0.35)' : subStatus.status === 'trialing' ? 'rgba(232, 162, 61, 0.35)' : 'rgba(255, 90, 40, 0.35)'}`,
                }}>
                  ● {subStatus.status.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>
                  {subStatus.plan_name}
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                {subStatus.status === 'active'
                  ? `Active through ${subStatus.current_period_end ? new Date(subStatus.current_period_end).toLocaleDateString() : 'N/A'} (${subStatus.days_remaining} days left)`
                  : subStatus.status === 'trialing'
                  ? `14-Day Free Evaluation expires in ${subStatus.days_remaining} days`
                  : 'Subscription expired. Please activate an institutional tier via Razorpay.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '180px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--text-subtle)' }}>Profiles Managed:</span>
                <strong style={{ color: subStatus.quota_exceeded ? '#ff6b57' : 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  {subStatus.current_profiles} / {subStatus.profile_limit}
                </strong>
              </div>
              <div style={{ height: '6px', width: '100%', background: 'var(--steel-3)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (subStatus.current_profiles / Math.max(1, subStatus.profile_limit)) * 100)}%`,
                  background: subStatus.quota_exceeded ? '#ff5a28' : 'linear-gradient(90deg, #5FA37F, #5FA8C4)',
                  borderRadius: '3px',
                }} />
              </div>
            </div>

            <Link
              to="/admin/billing"
              className="button"
              style={{
                fontSize: '0.82rem',
                padding: '0.4rem 0.9rem',
                border: '1px solid rgba(255, 90, 40, 0.35)',
                background: 'rgba(255, 90, 40, 0.12)',
                color: '#ff7547',
                borderRadius: '8px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {subStatus.status === 'active' ? 'Manage Quota 💳' : 'Subscribe via Razorpay ⚡'}
            </Link>
          </div>
        </div>
      )}

      {/* ── Category Selector Grid ── */}
      <SectionCard title="1. Select Import Category" subtitle="Choose the institutional data domain you are uploading:">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', marginTop: '0.5rem' }}>
          {IMPORT_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.type
            return (
              <div
                key={cat.type}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedCategory(cat.type)
                  setValidationResult(null)
                  setFinalReport(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedCategory(cat.type)
                    setValidationResult(null)
                    setFinalReport(null)
                  }
                }}
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  background: isSelected ? 'rgba(255, 107, 53, 0.08)' : 'var(--surface-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: isSelected ? 'var(--accent)' : 'var(--text)' }}>{cat.title}</h4>
                  {cat.adminOnly && (
                    <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(240, 84, 106, 0.15)', color: '#f0546a', fontWeight: 600 }}>
                      ADMIN
                    </span>
                  )}
                </div>
                <p style={{ margin: '0.2rem 0 0.6rem 0', fontSize: '0.8rem', color: 'var(--text-subtle)', lineHeight: 1.3 }}>{cat.subtitle}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Key cols: {cat.keyCols.slice(0, 3).join(', ')}...</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      downloadTemplateCsv(cat.templateFile)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    Template 📥
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* ── Step 1: Upload Area ── */}
      <SectionCard title={`2. Upload CSV for ${activeCategoryMeta.title}`} subtitle="Select your CSV file or drag and drop it below (max 15MB):">
        <div
          role="button"
          tabIndex={0}
          aria-label="Choose a CSV file"
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          style={{
            border: isDragging ? '2px dashed var(--accent)' : '2px dashed var(--border)',
            borderRadius: '12px',
            padding: '2rem 1.25rem',
            textAlign: 'center',
            background: isDragging ? 'rgba(255, 107, 53, 0.05)' : 'var(--surface-subtle)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            boxSizing: 'border-box',
            maxWidth: '100%',
          }}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
          }}
        >
          <input
            id={fileInputId}
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelection(e.target.files[0])
              }
            }}
          />
          <div style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>📄</div>
          {file ? (
            <div>
              <p style={{ margin: '0 0 0.3rem 0', fontWeight: 600, fontSize: '1.05rem', color: 'var(--accent)' }}>{file.name}</p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-subtle)' }}>{(file.size / 1024).toFixed(1)} KB · Ready for validation</p>
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 0.3rem 0', fontWeight: 600, fontSize: '1rem' }}>Drag and drop CSV file here, or click to browse</p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-subtle)' }}>Standard comma-separated format (.csv) only</p>
            </div>
          )}
        </div>

        {errorMessage && (
          <div style={{ marginTop: '1rem', padding: '0.8rem 1rem', borderRadius: '8px', background: 'rgba(240, 84, 106, 0.12)', border: '1px solid rgba(240, 84, 106, 0.3)', color: '#f0546a', fontSize: '0.88rem' }}>
            ⚠️ {errorMessage}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
          <button
            type="button"
            className="button"
            style={{
              border: '1px solid var(--border)',
              background: 'var(--surface-subtle)',
              color: 'var(--text)',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => downloadTemplateCsv(activeCategoryMeta.templateFile)}
          >
            📥 Download {activeCategoryMeta.templateFile}
          </button>
          <button
            type="button"
            className="button"
            disabled={!file || isValidating}
            onClick={handleValidate}
            style={{
              background: !file || isValidating ? 'var(--surface-subtle)' : 'var(--accent)',
              color: !file || isValidating ? 'var(--text-muted)' : '#FFFFFF',
              fontWeight: 700,
              minWidth: '170px',
              borderRadius: '8px',
              padding: '0.5rem 1.25rem',
              border: 'none',
              cursor: !file || isValidating ? 'not-allowed' : 'pointer',
              boxShadow: !file || isValidating ? 'none' : '0 4px 12px rgba(255, 107, 53, 0.25)',
            }}
          >
            {isValidating ? 'Analyzing CSV...' : 'Validate & Preview →'}
          </button>
        </div>
      </SectionCard>

      {/* ── Step 2 & 3: Column Mapping & Pre-Validation Inspection ── */}
      {validationResult && (
        <>
          <section className="grid kpi">
            <StatCard title="Total Rows In File" value={validationResult.total_rows.toLocaleString()} subtitle="Processed data lines" />
            <StatCard title="Valid Records" value={validationResult.valid_rows.toLocaleString()} subtitle="Ready for insertion" />
            <StatCard title="Warnings Flagged" value={validationResult.warning_rows.toLocaleString()} subtitle="Non-fatal anomalies" />
            <StatCard title="Validation Errors" value={validationResult.error_rows.toLocaleString()} subtitle={validationResult.error_rows > 0 ? 'Action required' : 'Clean'} />
          </section>

          {/* ── Column Mapping Card ── */}
          <SectionCard title="3. Intelligent Column Mapping" subtitle="Verify detected CSV headers mapped to FORGR institutional fields:">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
              {validationResult.mappings.map((m) => (
                <div
                  key={m.detected_column}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>CSV Header:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{m.detected_column}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Mapped Field:</span>
                    <span style={{ fontWeight: 700, color: m.status === 'valid' ? 'var(--teal)' : '#f2a93b' }}>
                      {customMappings[m.detected_column] || m.mapped_field}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ── Record Preview Table ── */}
          <SectionCard title="4. Sample Record Preview (First 5 Rows)" subtitle="Data records parsed with mapped attributes:">
            <div style={{
              overflowX: 'auto',
              marginTop: '0.5rem',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              WebkitOverflowScrolling: 'touch',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <table className="table" style={{ width: '100%', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr>
                    {Object.keys(validationResult.preview_records[0] || {}).map((col) => (
                      <th key={col} style={{ padding: '0.6rem 0.8rem', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {validationResult.preview_records.slice(0, 5).map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {Object.values(row).map((val, cIdx) => (
                        <td key={cIdx} style={{ padding: '0.6rem 0.8rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                          {String(val ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* ── Validation Error Report (if any) ── */}
          {validationResult.validation_errors.length > 0 && (
            <SectionCard title={`Validation Findings (${validationResult.validation_errors.length} items)`} subtitle="Detailed issues detected before database execution:">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.8rem' }}>
                <button
                  type="button"
                  className="button"
                  onClick={handleDownloadErrorReport}
                  style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--text)', fontSize: '0.85rem' }}
                >
                  📥 Download Error Report (CSV)
                </button>
              </div>
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Row</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Student ID</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Field</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Issue Reason</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Correction</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResult.validation_errors.map((err, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '0.5rem' }}>{err.row_number}</td>
                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>{err.student_id || 'N/A'}</td>
                        <td style={{ padding: '0.5rem', color: 'var(--accent)' }}>{err.field}</td>
                        <td style={{ padding: '0.5rem' }}>{err.error_reason}</td>
                        <td style={{ padding: '0.5rem', color: 'var(--text-subtle)' }}>{err.suggested_correction}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: err.severity === 'error' ? 'rgba(240, 84, 106, 0.15)' : 'rgba(242, 169, 59, 0.15)',
                              color: err.severity === 'error' ? '#f0546a' : '#f2a93b',
                            }}
                          >
                            {err.severity.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* ── Step 5: Import Mode Selection & Execution ── */}
          <SectionCard title="5. Import Mode & Confirmation" subtitle="Choose synchronization strategy before committing records to the database:">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
              {[
                { mode: 'upsert' as const, title: 'C. UPSERT (Recommended)', desc: 'Creates new records and updates existing student records.' },
                { mode: 'create' as const, title: 'A. CREATE ONLY', desc: 'Inserts only new records; skips any existing duplicates.' },
                { mode: 'update' as const, title: 'B. UPDATE ONLY', desc: 'Updates existing student records only; ignores non-existent.' },
                { mode: 'replace' as const, title: 'D. REPLACE (Destructive)', desc: 'Clears dataset records and replaces completely. Requires confirmation.' },
              ].map((m) => {
                const isModeSelected = importMode === m.mode
                return (
                  <div
                    key={m.mode}
                    onClick={() => setImportMode(m.mode)}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      border: isModeSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                      background: isModeSelected ? 'rgba(255, 107, 53, 0.08)' : 'var(--surface-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <h5 style={{ margin: '0 0 0.3rem 0', color: isModeSelected ? 'var(--accent)' : 'var(--text)', fontSize: '0.92rem' }}>{m.title}</h5>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-subtle)', lineHeight: 1.3 }}>{m.desc}</p>
                  </div>
                )
              })}
            </div>

            {importMode === 'replace' && (
              <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(240, 84, 106, 0.1)', border: '1px solid rgba(240, 84, 106, 0.3)', marginBottom: '1.2rem' }}>
                <h5 style={{ margin: '0 0 0.3rem 0', color: '#f0546a' }}>⚠️ Important Notice on Replace Mode</h5>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-subtle)' }}>
                  Replace mode will wipe the current records for this domain and rebuild them exclusively from this CSV. This operation is strictly logged in the system audit trail.
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={replaceConfirmed}
                    onChange={(e) => setReplaceConfirmed(e.target.checked)}
                  />
                  I confirm that I want to replace the current institutional dataset.
                </label>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                type="button"
                className="button"
                disabled={isExecuting || (importMode === 'replace' && !replaceConfirmed)}
                onClick={handleExecute}
                style={{
                  background: isExecuting || (importMode === 'replace' && !replaceConfirmed) ? 'var(--surface-subtle)' : 'var(--accent)',
                  color: isExecuting || (importMode === 'replace' && !replaceConfirmed) ? 'var(--text-muted)' : '#FFFFFF',
                  fontWeight: 700,
                  padding: '0.75rem 2rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: isExecuting || (importMode === 'replace' && !replaceConfirmed) ? 'not-allowed' : 'pointer',
                  boxShadow: isExecuting || (importMode === 'replace' && !replaceConfirmed) ? 'none' : '0 4px 14px rgba(255, 107, 53, 0.3)',
                }}
              >
                {isExecuting ? 'Ingesting Data & Recalculating ML Pipeline...' : `Execute ${importMode.toUpperCase()} Import →`}
              </button>
            </div>
          </SectionCard>
        </>
      )}

      {/* ── Step 6: Final Report Modal / Section ── */}
      {finalReport && (
        <SectionCard title="Import Completed Successfully" subtitle={`Batch ID: ${finalReport.batch_id}`}>
          <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(47, 212, 196, 0.1)', border: '1px solid rgba(47, 212, 196, 0.3)', marginBottom: '1.2rem' }}>
            <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--teal)' }}>✅ {finalReport.message}</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-subtle)' }}>
              Inserted: {finalReport.inserted} · Updated: {finalReport.updated} · Skipped: {finalReport.skipped} · Failed: {finalReport.failed}
            </p>
          </div>

          {finalReport.analysis_report && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.6rem' }}>Post-Import Cohort Health: {finalReport.analysis_report.cohort_health}</h4>
              <div className="grid kpi">
                <StatCard title="Cohort Active Students" value={finalReport.analysis_report.total_students.toLocaleString()} subtitle="In live database" />
                <StatCard title="Average CGPA" value={String(finalReport.analysis_report.avg_cgpa)} subtitle="Across all branches" />
                <StatCard title="Average Attendance" value={`${finalReport.analysis_report.avg_attendance}%`} subtitle="Institutional average" />
                <StatCard title="Placement Readiness" value={`${finalReport.analysis_report.placement_readiness_pct}%`} subtitle="Drive eligible" />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <Link to="/admin" className="button" style={{ background: 'var(--accent)', color: '#0c0e12', fontWeight: 700 }}>
              Go to Admin Dashboard →
            </Link>
            <Link to="/admin/import-history" className="button" style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--text)' }}>
              View in Import History
            </Link>
          </div>
        </SectionCard>
      )}
    </div>
  )
}

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getAdminDashboardData } from '../../services/dashboardApi'
import { getStudents } from '../../services/studentsApi'
import { getStudentProfile, updateStudentProfile } from '../../services/profileApi'
import type { AdminDashboardData, Student, StudentProfile } from '../../types/domain'

function marksToText(marks: StudentProfile['marks']) {
  return Object.entries(marks).map(([s, v]) => `${s}: ${v}`).join('\n')
}
function textToMarks(value: string) {
  return value.split('\n').map((i) => i.trim()).filter(Boolean).reduce<Record<string, number>>((a, i) => {
    const [s, v] = i.split(':')
    if (s?.trim()) a[s.trim()] = Number(v?.trim()) || 0
    return a
  }, {})
}
function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}
function riskBadgeClass(risk: string) {
  const r = risk.toLowerCase()
  if (r === 'high') return 'risk-high'
  if (r === 'medium') return 'risk-med'
  return 'ok'
}

export function AdminDashboardPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [branchFilter, setBranchFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [attendanceText, setAttendanceText] = useState('')
  const [marksText, setMarksText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  useEffect(() => {
    async function load() {
      setIsLoading(true); setError(''); setSaveMessage('')
      try {
        const [loaded, dashboard] = await Promise.all([getStudents(), getAdminDashboardData()])
        setStudents(loaded); setData(dashboard)
        setSelectedStudentId((c) => c || loaded[0]?.student_id || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load.')
      } finally { setIsLoading(false) }
    }
    void load()
  }, [])

  useEffect(() => {
    async function loadProfile() {
      if (!selectedStudentId) { setProfile(null); return }
      setProfileLoading(true); setError('')
      try {
        const p = await getStudentProfile(selectedStudentId)
        setProfile(p); setAttendanceText(String(p.attendancePercent)); setMarksText(marksToText(p.marks))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile.')
      } finally { setProfileLoading(false) }
    }
    void loadProfile()
  }, [selectedStudentId])

  const [searchQuery, setSearchQuery] = useState('')

  const branches = useMemo(() => ['all', ...new Set(students.map((s) => s.department))], [students])

  const filteredRows = useMemo(() => {
    if (!data) return []
    return data.studentRows.filter((r) => {
      const b = branchFilter === 'all' || r.department === branchFilter
      const y = yearFilter === 'all' || String(r.year) === yearFilter
      const q = !searchQuery.trim() || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.student_id.toLowerCase().includes(searchQuery.toLowerCase()) || r.department.toLowerCase().includes(searchQuery.toLowerCase())
      return b && y && q
    })
  }, [branchFilter, data, searchQuery, yearFilter])

  const effectiveSelectedStudentId = filteredRows.some((row) => row.student_id === selectedStudentId)
    ? selectedStudentId
    : filteredRows[0]?.student_id ?? ''

  const selectedStudent = useMemo(() => students.find((s) => s.student_id === effectiveSelectedStudentId) ?? null, [effectiveSelectedStudentId, students])

  const onSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!effectiveSelectedStudentId) { setError('Select a student.'); return }
    setIsSaving(true); setError(''); setSaveMessage('')
    try {
      const u = await updateStudentProfile(effectiveSelectedStudentId, { attendancePercent: Number(attendanceText) || 0, marks: textToMarks(marksText) })
      setProfile(u); setAttendanceText(String(u.attendancePercent)); setMarksText(marksToText(u.marks))
      setSaveMessage('Student profile updated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update.')
    } finally { setIsSaving(false) }
  }

  if (isLoading) return <div className="fg-loading">Loading admin dashboard...</div>
  if (error && !data) return <div className="fg-error">{error}</div>
  if (!data) return <div className="fg-error">Unknown dashboard error.</div>

  const placementRate = data.totalStudents > 0 ? Math.round((data.placementReadyStudents / data.totalStudents) * 100) : 0

  return (
    <div className="fg-panel-enter">
      {/* ── Stat cards ── */}
      <div className="fg-row fg-grid fg-g4">
        <div className="fg-stat-card" style={{ '--accent': 'var(--tempered)' } as React.CSSProperties}>
          <div className="fg-lbl">Students tracked</div>
          <div className="fg-val">{data.totalStudents.toLocaleString()}</div>
          <div className="fg-delta flat">All branches</div>
        </div>
        <div className="fg-stat-card" style={{ '--accent': 'var(--patina)' } as React.CSSProperties}>
          <div className="fg-lbl">Avg. employability</div>
          <div className="fg-val">{data.avgEmployability ?? 74}<span className="fg-u">/100</span></div>
          <div className="fg-delta up">▲ live cohort metric</div>
        </div>
        <div className="fg-stat-card" style={{ '--accent': 'var(--ember)' } as React.CSSProperties}>
          <div className="fg-lbl">At-risk students</div>
          <div className="fg-val">{data.highRiskStudents}</div>
          <div className="fg-delta down">▲ needs review</div>
        </div>
        <div className="fg-stat-card" style={{ '--accent': 'var(--amber)' } as React.CSSProperties}>
          <div className="fg-lbl">Placement rate</div>
          <div className="fg-val">{placementRate}<span className="fg-u">%</span></div>
          <div className="fg-delta up">ready</div>
        </div>
      </div>

      {/* ── Risk queue table ── */}
      <div className="fg-row fg-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 style={{ margin: 0 }}>Risk queue</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link
              to="/admin/bulk-import"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                background: 'var(--ember, #FF5A28)',
                color: '#FFF',
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(255,90,40,0.3)',
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload New Dataset (ML Sync)
            </Link>
            <button type="button" className="fg-card-action" onClick={() => {
              const headers = ['Student ID', 'Name', 'Department', 'Year', 'Risk', 'Attendance', 'Employability']
              const rows = data.studentRows.map((row) => [row.student_id, row.name, row.department, row.year, row.overall_risk, row.attendance_percentage ?? '', row.employability_score ?? ''])
              const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
              const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
              const link = document.createElement('a')
              link.href = url
              link.download = 'forgr-student-directory.csv'
              link.click()
              URL.revokeObjectURL(url)
            }}>Export list</button>
          </div>
        </div>
        <div className="fg-cap">Sorted by urgency. Flags trigger automatically from attendance, backlog and dropout models.</div>

        {data.alerts.length > 0 && (
          <div className="fg-alert-banner" style={{ marginBottom: 16 }}>
            <div className="fg-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                <path d="M12 3 2 20h20L12 3Z" /><path d="M12 9v5" />
                <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div>
              <div className="fg-t">{data.alerts[0]}</div>
              {data.alerts.slice(1, 3).map((a, i) => <div className="fg-d" key={i}>{a}</div>)}
            </div>
          </div>
        )}

        <table className="fg-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Risk</th>
              <th>Attendance</th>
              <th>Score</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.filter((r) => r.overall_risk !== 'Low').slice(0, 8).map((row) => (
              <tr key={row.student_id} className={row.student_id === effectiveSelectedStudentId ? 'selected-row' : ''} onClick={() => setSelectedStudentId(row.student_id)} style={{ cursor: 'pointer' }}>
                <td>
                  <div className="fg-name-cell">
                    <div className="fg-init">{getInitials(row.name)}</div>
                    {row.name} — {row.department}
                  </div>
                </td>
                <td><span className={`fg-badge ${riskBadgeClass(row.overall_risk)}`}>{row.overall_risk.toUpperCase()}</span></td>
                <td>{row.attendance_percentage != null ? `${Math.round(row.attendance_percentage)}%` : '—'}</td>
                <td>{row.employability_score != null ? `${Math.round(row.employability_score)}/100` : '—'}</td>
                <td><button className="fg-mini-btn" type="button" onClick={(event) => { event.stopPropagation(); setSelectedStudentId(row.student_id) }}>Review</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Cohort ranking ── */}
      <div className="fg-row">
        <div className="fg-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Student directory</h3>
            <input
              type="text"
              placeholder="🔍 Search student or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'var(--steel, #1D1F23)',
                border: '1px solid var(--line, #303237)',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                color: 'var(--off-white, #ECEAE5)',
                width: 170,
              }}
            />
          </div>
          <div className="fg-filter-row">
            {branches.map((b) => (
              <button type="button" key={b} className={`fg-filter-chip ${branchFilter === b ? 'active' : ''}`} onClick={() => setBranchFilter(b)}>
                {b === 'all' ? 'All branches' : b}
              </button>
            ))}
            {['all', '1', '2', '3', '4'].map((y) => (
              <button type="button" key={y} className={`fg-filter-chip ${yearFilter === y ? 'active' : ''}`} onClick={() => setYearFilter(y)}>
                {y === 'all' ? 'All years' : `Year ${y}`}
              </button>
            ))}
          </div>

          <table className="fg-table">
            <thead><tr><th>#</th><th>Student</th><th>CGPA</th><th>Risk</th></tr></thead>
            <tbody>
              {filteredRows.slice(0, 12).map((r, i) => (
                <tr key={r.student_id} className={r.student_id === effectiveSelectedStudentId ? 'selected-row' : ''} onClick={() => setSelectedStudentId(r.student_id)} style={{ cursor: 'pointer' }}>
                  <td>{i + 1}</td>
                  <td>{r.name}</td>
                  <td>{r.cgpa?.toFixed(2) ?? '—'}</td>
                  <td><span className={`fg-badge ${riskBadgeClass(r.overall_risk)}`}>{r.overall_risk}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRows.length > 12 && <div className="fg-cap" style={{ textAlign: 'center', marginTop: 8 }}>Showing 12 of {filteredRows.length} students</div>}
        </div>

      </div>

      {/* ── Edit selected student ── */}
      <div className="fg-card" style={{ marginTop: 0 }}>
        <h3>Edit selected student</h3>
        {!selectedStudent ? (
          <div className="fg-empty">Select a student to update attendance and marks.</div>
        ) : profileLoading ? (
          <div className="fg-loading">Loading student profile...</div>
        ) : (
          <form onSubmit={onSave} style={{ display: 'grid', gap: 16 }}>
            <div className="fg-cap">Editing {selectedStudent.name} | {selectedStudent.department} | Year {selectedStudent.year}</div>
            <div className="fg-form-grid narrow">
              <div className="fg-field">
                <label>Attendance %</label>
                <input type="number" min="0" max="100" value={attendanceText} onChange={(e) => setAttendanceText(e.target.value)} />
              </div>
              <div className="fg-field wide">
                <label>Marks by subject</label>
                <textarea rows={5} value={marksText} onChange={(e) => setMarksText(e.target.value)} placeholder="Mathematics: 78&#10;DSA: 84" />
              </div>
            </div>
            {profile && <div className="fg-report"><strong>Report: </strong>{profile.reportSummary}</div>}
            {error && data && <div className="fg-error">{error}</div>}
            {saveMessage && <div className="fg-success">{saveMessage}</div>}
            <button className="fg-btn-primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save student profile'}</button>
          </form>
        )}
      </div>

    </div>
  )
}

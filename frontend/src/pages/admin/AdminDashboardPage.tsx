import { useEffect, useMemo, useState, type FormEvent } from 'react'
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
    if (!selectedStudentId && students.length) setSelectedStudentId(students[0].student_id)
  }, [selectedStudentId, students])

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

  const branches = useMemo(() => ['all', ...new Set(students.map((s) => s.department))], [students])

  const filteredRows = useMemo(() => {
    if (!data) return []
    return data.studentRows.filter((r) => {
      const b = branchFilter === 'all' || r.department === branchFilter
      const y = yearFilter === 'all' || String(r.year) === yearFilter
      return b && y
    })
  }, [branchFilter, data, yearFilter])

  const selectedStudent = useMemo(() => students.find((s) => s.student_id === selectedStudentId) ?? null, [selectedStudentId, students])

  useEffect(() => {
    if (!filteredRows.length) { setSelectedStudentId(''); return }
    if (!filteredRows.some((r) => r.student_id === selectedStudentId)) setSelectedStudentId(filteredRows[0].student_id)
  }, [filteredRows, selectedStudentId])

  const onSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedStudentId) { setError('Select a student.'); return }
    setIsSaving(true); setError(''); setSaveMessage('')
    try {
      const u = await updateStudentProfile(selectedStudentId, { attendancePercent: Number(attendanceText) || 0, marks: textToMarks(marksText) })
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
          <div className="fg-val">76<span className="fg-u">/100</span></div>
          <div className="fg-delta up">▲ this term</div>
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
        <h3>Risk queue <span className="fg-card-action">Export list</span></h3>
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
              <tr key={row.student_id} className={row.student_id === selectedStudentId ? 'selected-row' : ''} onClick={() => setSelectedStudentId(row.student_id)} style={{ cursor: 'pointer' }}>
                <td>
                  <div className="fg-name-cell">
                    <div className="fg-init">{getInitials(row.name)}</div>
                    {row.name} — {row.department}
                  </div>
                </td>
                <td><span className={`fg-badge ${riskBadgeClass(row.overall_risk)}`}>{row.overall_risk.toUpperCase()}</span></td>
                <td>{row.attendance_percentage != null ? `${Math.round(row.attendance_percentage)}%` : '—'}</td>
                <td>{row.employability_score != null ? `${Math.round(row.employability_score)}/100` : '—'}</td>
                <td><button className="fg-mini-btn" type="button">Intervene</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Cohort ranking + Faculty tools ── */}
      <div className="fg-row fg-grid fg-g2">
        <div className="fg-card">
          <h3>Student table</h3>
          <div className="fg-filter-row">
            {branches.map((b) => (
              <span key={b} className={`fg-filter-chip ${branchFilter === b ? 'active' : ''}`} onClick={() => setBranchFilter(b)}>
                {b === 'all' ? 'All branches' : b}
              </span>
            ))}
            {['all', '1', '2', '3', '4'].map((y) => (
              <span key={y} className={`fg-filter-chip ${yearFilter === y ? 'active' : ''}`} onClick={() => setYearFilter(y)}>
                {y === 'all' ? 'All years' : `Year ${y}`}
              </span>
            ))}
          </div>

          <table className="fg-table">
            <thead><tr><th>#</th><th>Student</th><th>CGPA</th><th>Risk</th></tr></thead>
            <tbody>
              {filteredRows.slice(0, 12).map((r, i) => (
                <tr key={r.student_id} className={r.student_id === selectedStudentId ? 'selected-row' : ''} onClick={() => setSelectedStudentId(r.student_id)} style={{ cursor: 'pointer' }}>
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

        <div className="fg-card">
          <h3>Faculty tools</h3>
          <div className="fg-cap">Write-access actions — logged to the audit trail.</div>
          <div className="fg-grid" style={{ gap: 10 }}>
            <div className="fg-tool-tile">
              <div className="fg-tool-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
              </div>
              <div><div className="fg-t">Bulk upload marks / attendance</div><div className="fg-d">CSV import for a section or subject</div></div>
            </div>
            <div className="fg-tool-tile">
              <div className="fg-tool-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.9 6.4 20l1.4-6.2L3 9.5l6.4-.6L12 3Z" /></svg>
              </div>
              <div><div className="fg-t">Submit soft-skill evaluation</div><div className="fg-d">Rate communication, leadership, teamwork</div></div>
            </div>
            <div className="fg-tool-tile">
              <div className="fg-tool-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="3.5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="3.5" cy="18" r="1" fill="currentColor" stroke="none" /></svg>
              </div>
              <div><div className="fg-t">Audit trail</div><div className="fg-d">All edits logged and traceable</div></div>
            </div>
          </div>
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

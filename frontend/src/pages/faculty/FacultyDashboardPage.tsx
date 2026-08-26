import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getFacultyDashboardData } from '../../services/dashboardApi'
import { getStudents } from '../../services/studentsApi'
import type { FacultyDashboardData, Student } from '../../types/domain'

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function riskBadgeClass(risk: string) {
  const r = risk.toLowerCase()
  if (r === 'high') return 'risk-high'
  if (r === 'medium') return 'risk-med'
  return 'ok'
}

export function FacultyDashboardPage() {
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [data, setData] = useState<FacultyDashboardData | null>(null)
  const [branchFilter, setBranchFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError('')

      try {
        const [loadedStudents, dashboardData] = await Promise.all([
          getStudents(),
          getFacultyDashboardData(),
        ])
        setAllStudents(loadedStudents)
        setData(dashboardData)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load faculty dashboard.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  const branches = useMemo(() => {
    return ['all', ...new Set(allStudents.map((s) => s.department))]
  }, [allStudents])

  const filteredStudents = useMemo(() => {
    if (!data) return []
    return data.students.filter((s) => {
      const branchMatch = branchFilter === 'all' || s.department === branchFilter
      const yearMatch = yearFilter === 'all' || String(s.year) === yearFilter
      const riskMatch = riskFilter === 'all' || s.overall_risk === riskFilter
      const searchMatch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.student_id.toLowerCase().includes(searchQuery.toLowerCase())
      return branchMatch && yearMatch && riskMatch && searchMatch
    })
  }, [branchFilter, data, riskFilter, searchQuery, yearFilter])

  const skillChartData = useMemo(() => {
    if (!data) return []
    return Object.entries(data.skillAverages).map(([name, avg]) => ({ name, avg }))
  }, [data])

  if (isLoading) {
    return <div className="fg-loading">Loading faculty dashboard...</div>
  }

  if (error || !data) {
    return <div className="fg-error">{error || 'Unknown dashboard error.'}</div>
  }

  return (
    <div className="fg-panel-enter">
      {/* ── Stat cards ── */}
      <div className="fg-row fg-grid fg-g4">
        <div className="fg-stat-card" style={{ '--accent': 'var(--tempered)' } as React.CSSProperties}>
          <div className="fg-lbl">Total Students</div>
          <div className="fg-val">{data.totalStudents}</div>
          <div className="fg-delta flat">Assigned to you</div>
        </div>
        <div className="fg-stat-card" style={{ '--accent': 'var(--patina)' } as React.CSSProperties}>
          <div className="fg-lbl">Avg CGPA</div>
          <div className="fg-val">{data.avgCgpa.toFixed(2)}<span className="fg-u">/10</span></div>
          <div className="fg-delta up">Overall cohort</div>
        </div>
        <div className="fg-stat-card" style={{ '--accent': 'var(--amber)' } as React.CSSProperties}>
          <div className="fg-lbl">Low Attendance</div>
          <div className="fg-val">{data.lowAttendanceCount}</div>
          <div className="fg-delta down">Below 75%</div>
        </div>
        <div className="fg-stat-card" style={{ '--accent': 'var(--ember)' } as React.CSSProperties}>
          <div className="fg-lbl">High Risk</div>
          <div className="fg-val">{data.highRiskCount}</div>
          <div className="fg-delta down">Needs attention</div>
        </div>
      </div>

      <div className="fg-row fg-grid fg-g2">
        <div className="fg-card">
          <h3>Attendance Trend (by Semester)</h3>
          <div className="fg-cap">Cohort average attendance over time.</div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="semester" stroke="var(--grey-dim)" tick={{ fill: 'var(--grey)', fontSize: 11 }} />
              <YAxis domain={[60, 100]} stroke="var(--grey-dim)" tick={{ fill: 'var(--grey)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--steel-2)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--off-white)' }}
                itemStyle={{ color: 'var(--tempered)' }}
              />
              <Line type="monotone" dataKey="avg_attendance" stroke="var(--tempered)" strokeWidth={3} dot={{ fill: 'var(--tempered)', r: 4 }} name="Avg Attendance %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="fg-card">
          <h3>Skill Averages</h3>
          <div className="fg-cap">Average scores across different skill domains.</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={skillChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="name" stroke="var(--grey-dim)" tick={{ fill: 'var(--grey)', fontSize: 10 }} />
              <YAxis domain={[0, 100]} stroke="var(--grey-dim)" tick={{ fill: 'var(--grey)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--steel-2)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--off-white)' }}
                itemStyle={{ color: 'var(--patina)' }}
                cursor={{ fill: 'var(--steel-3)' }}
              />
              <Bar dataKey="avg" fill="var(--patina)" radius={[4, 4, 0, 0]} name="Average Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="fg-row fg-card">
        <h3>Student Performance Table <span className="fg-card-action">Export</span></h3>
        <div className="fg-cap">Detailed view of assigned students. Click a row for more details.</div>
        <div className="fg-controls">
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            {branches.map((b) => (
              <option key={b} value={b}>{b === 'all' ? 'All branches' : b}</option>
            ))}
          </select>
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="all">All years</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
            <option value="all">All risk levels</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        {!filteredStudents.length ? (
          <div className="fg-empty">No students match these filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="fg-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Student</th>
                  <th>Year / Sec</th>
                  <th>CGPA</th>
                  <th>Attendance</th>
                  <th>Backlogs</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.slice(0, 50).map((s) => (
                  <tr
                    key={s.student_id}
                    className={expandedStudentId === s.student_id ? 'selected-row' : ''}
                    onClick={() => setExpandedStudentId(expandedStudentId === s.student_id ? null : s.student_id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--grey-dim)' }}>{s.student_id}</td>
                    <td>
                      <div className="fg-name-cell">
                        <div className="fg-init">{getInitials(s.name)}</div>
                        <div>
                          <div>{s.name}</div>
                          <div style={{ fontSize: '10.5px', color: 'var(--grey-dim)', marginTop: '2px' }}>{s.department}</div>
                        </div>
                      </div>
                    </td>
                    <td>{s.year} / {s.section ?? '—'}</td>
                    <td>{s.cgpa?.toFixed(2) ?? '—'}</td>
                    <td>{s.attendance_percentage != null ? `${Math.round(s.attendance_percentage)}%` : '—'}</td>
                    <td>{s.backlogs}</td>
                    <td>
                      <span className={`fg-badge ${riskBadgeClass(s.overall_risk)}`}>{s.overall_risk}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStudents.length > 50 && (
              <div className="fg-cap" style={{ textAlign: 'center', marginTop: 12 }}>
                Showing 50 of {filteredStudents.length} students
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
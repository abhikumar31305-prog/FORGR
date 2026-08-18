import { useEffect, useState, type FormEvent } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SectionCard } from '../../components/ui/SectionCard'
import { StatCard } from '../../components/ui/StatCard'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { useAuth } from '../../context/AuthContext'
import { getAttendance, updateAttendance } from '../../services/featureApi'
import type { AttendanceRecord } from '../../types/domain'

export function AttendancePage() {
  const { session } = useAuth()
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  // Form state
  const [semester, setSemester] = useState('1')
  const [percentage, setPercentage] = useState('80')
  const [attended, setAttended] = useState('120')
  const [conducted, setConducted] = useState('150')

  useEffect(() => {
    async function load() {
      const sid = session?.studentId || '1001'
      setIsLoading(true)
      setError('')

      try {
        const data = await getAttendance(sid)
        setAttendanceList(data)
        if (data.length) {
          const latest = data[data.length - 1]
          setSemester(String(latest.semester))
          setPercentage(String(Math.round(latest.attendance_percentage)))
          setAttended(String(latest.classes_attended ?? 120))
          setConducted(String(latest.classes_conducted ?? 150))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load attendance records.')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [session])

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    const sid = session?.studentId || '1001'
    setIsSaving(true)
    setError('')
    setSaveMessage('')

    try {
      const pct = Number(percentage)
      await updateAttendance(sid, {
        semester: Number(semester),
        attendance_percentage: pct,
        classes_attended: Number(attended),
        classes_conducted: Number(conducted),
      })
      const refreshed = await getAttendance(sid)
      setAttendanceList(refreshed)
      setSaveMessage('Attendance updated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update attendance.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="loading">Loading attendance analytics...</div>

  const latest = attendanceList.length ? attendanceList[attendanceList.length - 1] : null
  const latestPct = latest ? Math.round(latest.attendance_percentage) : 0
  const isLow = latestPct < 75

  const chartData = attendanceList.map((a) => ({
    label: `Sem ${a.semester}`,
    Percentage: Math.round(a.attendance_percentage),
    Attended: a.classes_attended ?? 0,
    Conducted: a.classes_conducted ?? 0,
  }))

  return (
    <div className="grid stagger">
      <header className="dashboard-hero">
        <p className="eyebrow">Attendance Tracker</p>
        <h2 className="headline" style={{ fontSize: '1.8rem' }}>Attendance & Class Participation</h2>
        <p className="subtle">Monitor semester attendance percentages and maintain eligibility threshold (&ge;75%).</p>
      </header>

      <section className="grid kpi">
        <StatCard title="Current Semester Attendance" value={`${latestPct}%`} subtitle={isLow ? '⚠️ Below 75% threshold' : 'Eligible for exams'} />
        <StatCard title="Classes Attended" value={latest?.classes_attended ?? '—'} subtitle="Total attended" />
        <StatCard title="Classes Conducted" value={latest?.classes_conducted ?? '—'} subtitle="Total held" />
        <StatCard title="Attendance Status" value={isLow ? 'At Risk' : 'Satisfactory'} subtitle={isLow ? 'De-barment risk' : 'Clear'} />
      </section>

      <SectionCard title="Attendance Meter">
        <ProgressBar value={latestPct} label="Overall Semester Attendance" color={isLow ? 'var(--danger)' : latestPct < 85 ? 'var(--warn)' : 'var(--teal)'} />
        <p className="subtle" style={{ marginTop: '0.4rem', fontSize: '0.85rem' }}>
          {isLow
            ? '⚠️ Your attendance is below 75%. You need to attend upcoming classes consistently to avoid hall ticket restriction.'
            : '✅ Good standing. Maintain your current attendance to stay above the 75% requirement.'}
        </p>
      </SectionCard>

      <section className="grid two">
        <SectionCard title="Attendance Percentage Trend">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="label" stroke="var(--muted)" tick={{ fontSize: 12 }} />
              <YAxis domain={[50, 100]} stroke="var(--muted)" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--ink)' }} />
              <Line type="monotone" dataKey="Percentage" stroke="#2fd4c4" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Attended vs Conducted Classes">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="label" stroke="var(--muted)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--ink)' }} />
              <Legend />
              <Bar dataKey="Attended" fill="#2fd4c4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Conducted" fill="#7c8cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </section>

      {/* ── Edit Form (Only Faculty & Admin have official write access) ── */}
      {session?.role === 'faculty' || session?.role === 'admin' ? (
        <SectionCard title="Official Attendance Record Entry (Faculty / Admin Access)">
          <form className="edit-form" onSubmit={onSave}>
            <div className="form-grid narrow">
              <div className="field">
                <span>Semester</span>
                <input type="number" min="1" max="8" value={semester} onChange={(e) => setSemester(e.target.value)} />
              </div>
              <div className="field">
                <span>Attendance %</span>
                <input type="number" min="0" max="100" value={percentage} onChange={(e) => setPercentage(e.target.value)} />
              </div>
              <div className="field">
                <span>Attended Classes</span>
                <input type="number" min="0" value={attended} onChange={(e) => setAttended(e.target.value)} />
              </div>
              <div className="field">
                <span>Conducted Classes</span>
                <input type="number" min="0" value={conducted} onChange={(e) => setConducted(e.target.value)} />
              </div>
            </div>
            {error ? <div className="error">{error}</div> : null}
            {saveMessage ? <div className="success">{saveMessage}</div> : null}
            <button className="btn btn-primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Updating...' : 'Save Official Attendance Record'}
            </button>
          </form>
        </SectionCard>
      ) : (
        <SectionCard title="Institutional Attendance Record">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.5rem 0' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(232,162,61,0.12)', color: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              🛡️
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Biometric / ERP Attendance Record</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '2px' }}>
                Attendance is synchronized directly from departmental biometric/ERP logs and faculty registers. Students may track eligibility trends and shortage alerts.
              </div>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  )
}

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
import { useAuth } from '../../context/useAuth'
import { useActiveStudentId } from '../../context/useActiveStudentId'
import { StudentRecordGate } from '../../components/CohortStudentPicker'
import { getAcademics, updateAcademics } from '../../services/featureApi'
import type { AcademicRecord } from '../../types/domain'

export function AcademicsPage() {
  const { session } = useAuth()
  const { studentId } = useActiveStudentId()
  const [academics, setAcademics] = useState<AcademicRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  // Edit form state
  const [semester, setSemester] = useState('1')
  const [cgpa, setCgpa] = useState('')
  const [sgpa, setSgpa] = useState('')
  const [backlogs, setBacklogs] = useState('0')

  useEffect(() => {
    async function load() {
      if (!studentId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const data = await getAcademics(studentId)
        setAcademics(data)
        if (data.length) {
          const latest = data[data.length - 1]
          setSemester(String(latest.semester))
          setCgpa(String(latest.cgpa))
          setSgpa(String(latest.sgpa))
          setBacklogs(String(latest.backlogs))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load academic records.')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [studentId])

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!studentId) return
    setIsSaving(true)
    setError('')
    setSaveMessage('')

    try {
      await updateAcademics(studentId, {
        semester: Number(semester),
        cgpa: Number(cgpa),
        sgpa: Number(sgpa),
        backlogs: Number(backlogs),
      })
      const refreshed = await getAcademics(studentId)
      setAcademics(refreshed)
      setSaveMessage('Academic records updated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update academic record.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="loading">Loading academic intelligence...</div>

  const latest = academics.length ? academics[academics.length - 1] : null
  const trendData = academics.map((a) => ({
    label: `Sem ${a.semester}`,
    CGPA: a.cgpa,
    SGPA: a.sgpa,
    Internal: a.internal_avg ?? 0,
    External: a.external_avg ?? 0,
  }))

  return (
    <StudentRecordGate>
    <div className="grid stagger">
      <header className="dashboard-hero">
        <p className="eyebrow">Academic Intelligence</p>
        <h2 className="headline" style={{ fontSize: '1.8rem' }}>Academic Performance & Growth</h2>
        <p className="subtle">Track semester CGPA/SGPA progression, backlogs, and exam performance.</p>
      </header>

      <section className="grid kpi">
        <StatCard title="Cumulative CGPA" value={latest?.cgpa.toFixed(2) ?? '—'} subtitle="Overall grade" />
        <StatCard title="Latest SGPA" value={latest?.sgpa.toFixed(2) ?? '—'} subtitle={`Semester ${latest?.semester ?? 1}`} />
        <StatCard title="Active Backlogs" value={latest?.backlogs ?? 0} subtitle={latest?.backlogs === 0 ? 'Clear status' : 'Attention needed'} />
        <StatCard title="Class Rank" value={latest?.class_rank ? `#${latest.class_rank}` : 'Top 15%'} subtitle="Cohort standing" />
      </section>

      <section className="grid two">
        <SectionCard title="CGPA / SGPA Progression">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="label" stroke="var(--muted)" tick={{ fontSize: 12 }} />
              <YAxis domain={[4, 10]} stroke="var(--muted)" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--ink)' }} />
              <Legend />
              <Line type="monotone" dataKey="CGPA" stroke="#7c8cf8" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="SGPA" stroke="#2fd4c4" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Internal vs External Marks Average">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="label" stroke="var(--muted)" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} stroke="var(--muted)" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--ink)' }} />
              <Legend />
              <Bar dataKey="Internal" fill="#7c8cf8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="External" fill="#f2a93b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </section>

      <SectionCard title="Semester Breakdown Table">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Semester</th>
                <th>CGPA</th>
                <th>SGPA</th>
                <th>Backlogs</th>
                <th>Class Rank</th>
                <th>Internal Avg</th>
                <th>External Avg</th>
              </tr>
            </thead>
            <tbody>
              {academics.map((row) => (
                <tr key={row.semester}>
                  <td>Semester {row.semester}</td>
                  <td><strong>{row.cgpa.toFixed(2)}</strong></td>
                  <td>{row.sgpa.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${row.backlogs === 0 ? 'badge-success' : 'badge-muted'}`}>
                      {row.backlogs}
                    </span>
                  </td>
                  <td>{row.class_rank ? `#${row.class_rank}` : '—'}</td>
                  <td>{row.internal_avg ?? '—'}</td>
                  <td>{row.external_avg ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ── Edit Form (Only Faculty & Admin have official write access) ── */}
      {session?.role === 'faculty' || session?.role === 'admin' ? (
        <SectionCard title="Official Academic Record Entry (Faculty / Admin Access)">
          <form className="edit-form" onSubmit={onSave}>
            <div className="form-grid narrow">
              <div className="field">
                <span>Semester</span>
                <input type="number" min="1" max="8" value={semester} onChange={(e) => setSemester(e.target.value)} />
              </div>
              <div className="field">
                <span>CGPA</span>
                <input type="number" step="0.01" min="0" max="10" value={cgpa} onChange={(e) => setCgpa(e.target.value)} />
              </div>
              <div className="field">
                <span>SGPA</span>
                <input type="number" step="0.01" min="0" max="10" value={sgpa} onChange={(e) => setSgpa(e.target.value)} />
              </div>
              <div className="field">
                <span>Backlogs</span>
                <input type="number" min="0" value={backlogs} onChange={(e) => setBacklogs(e.target.value)} />
              </div>
            </div>
            {error ? <div className="error">{error}</div> : null}
            {saveMessage ? <div className="success">{saveMessage}</div> : null}
            <button className="btn btn-primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Updating...' : 'Save Official Academic Record'}
            </button>
          </form>
        </SectionCard>
      ) : (
        <SectionCard title="Official Transcript Status">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.5rem 0' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(95,168,196,0.12)', color: 'var(--tempered)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              🔒
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Verified Academic Transcript</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '2px' }}>
                Academic marks, SGPA, CGPA, and backlogs are official institutional records verified by the Examination Authority & Faculty. Students can view analytics but cannot alter official grades.
              </div>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
    </StudentRecordGate>
  )
}

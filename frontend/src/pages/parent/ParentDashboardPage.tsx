import { useEffect, useState } from 'react'
import { useAuth } from '../../context/useAuth'
import { getParentDashboardData } from '../../services/dashboardApi'
import { getStudentReportCard } from '../../services/profileApi'
import type { ParentDashboardData, StudentProfile } from '../../types/domain'

import { generateReportCardPdf } from '../../utils/pdfGenerator'

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

export function ParentDashboardPage() {
  const { session } = useAuth()
  const [data, setData] = useState<ParentDashboardData | null>(null)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError('')
      if (!session?.studentId) { setError('Unable to determine linked student.'); setIsLoading(false); return }
      try {
        const [response, reportCard] = await Promise.all([
          getParentDashboardData(session.studentId),
          getStudentReportCard(session.studentId),
        ])
        setData(response)
        setProfile(reportCard)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load parent dashboard.')
      } finally { setIsLoading(false) }
    }
    void load()
  }, [session?.studentId])

  if (isLoading) return <div className="fg-loading">Loading parent dashboard...</div>
  if (error || !data) return <div className="fg-error">{error || 'Unknown dashboard error.'}</div>

  const initials = getInitials(data.childName)
  const empScore = profile ? Math.round((profile.skills.reduce((a, s) => a + s.score, 0) / Math.max(profile.skills.length, 1))) : 0
  const attendanceIsLow = data.attendancePercent < 80

  const handleDownloadPdf = () => {
    generateReportCardPdf(data, profile)
  }

  return (
    <div className="fg-panel-enter">
      {/* ── Ward selector & Actions ── */}
      <div className="fg-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div className="fg-ward-select">
          <div className="fg-init">{initials}</div>
          {data.childName} — {data.branch} Year {data.year}
          <span className="fg-car">▾ switch ward</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleDownloadPdf}
            className="fg-btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: '#5FA37F',
              color: '#0D141C',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span>📄 Download Report Card (PDF)</span>
          </button>
          <div className="fg-view-locked">
            <span>🔒</span> Read-only report — no edit access
          </div>
        </div>
      </div>

      {/* ── Alert banner ── */}
      {attendanceIsLow && (
        <div className="fg-alert-banner">
          <div className="fg-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M12 3 2 20h20L12 3Z" /><path d="M12 9v5" />
              <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div>
            <div className="fg-t">Attendance is trending below the safe threshold</div>
            <div className="fg-d">
              {data.childName}'s attendance has dropped to {Math.round(data.attendancePercent)}% this month. We'd suggest checking in — no action is needed on your end beyond that.
            </div>
          </div>
        </div>
      )}

      {/* ── Employability gauge + Academic standing ── */}
      <div className="fg-row fg-grid fg-g2">
        <div className="fg-card">
          <h3>Employability score</h3>
          <div className="fg-cap">Generated from {data.childName}'s academic, skill and activity record.</div>
          <div className="fg-gauge-wrap">
            <div className="fg-gauge" style={{ '--pct': empScore } as React.CSSProperties}>
              <div className="fg-gauge-inner">
                <div className="fg-n">{empScore}</div>
                <div className="fg-n2">/ 100</div>
              </div>
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--grey)', lineHeight: 1.6 }}>
              {data.childName}'s score has held steady this term.
              {profile && profile.skills.length > 0 && (
                <>
                  {' '}Strongest area: <span style={{ color: 'var(--off-white)' }}>
                    {[...profile.skills].sort((a, b) => b.score - a.score)[0]?.name}
                  </span>.
                  {profile.skills.length > 1 && (
                    <>
                      {' '}Growth area: <span style={{ color: 'var(--off-white)' }}>
                        {[...profile.skills].sort((a, b) => a.score - b.score)[0]?.name}
                      </span>.
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="fg-card">
          <h3>Academic standing</h3>
          <div className="fg-cap">CGPA trend across semesters.</div>
          <div className="fg-spark-wrap">
            <div>
              <div className="fg-spark-num">
                {data.currentCgpa.toFixed(1)}
                <span style={{ fontSize: 13, color: 'var(--grey-dim)' }}>/10</span>
              </div>
              <div className="fg-delta up" style={{ marginTop: 4 }}>cumulative CGPA</div>
            </div>
            <svg width="180" height="54" viewBox="0 0 180 54" style={{ marginLeft: 'auto' }}>
              <polyline
                points={data.academicsTrend.map((a, i) => `${i * (180 / Math.max(data.academicsTrend.length - 1, 1))},${54 - (a.cgpa / 10) * 54}`).join(' ')}
                fill="none"
                stroke="#5FA37F"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="fg-skill-row">
              <span className="fg-lbl">Attendance</span>
              <div className="fg-skill-bar">
                <div className={`fg-skill-fill ${data.attendancePercent >= 75 ? 'strong' : 'gap'}`} style={{ width: `${data.attendancePercent}%` }} />
              </div>
              <span className={`fg-tag ${data.attendancePercent >= 75 ? 'strong' : 'gap'}`}>{Math.round(data.attendancePercent)}%</span>
            </div>
            <div className="fg-skill-row">
              <span className="fg-lbl">Backlogs</span>
              <div className="fg-skill-bar">
                <div className="fg-skill-fill strong" style={{ width: profile ? (profile.backlogs === 0 ? '100%' : `${100 - profile.backlogs * 25}%`) : '100%' }} />
              </div>
              <span className="fg-tag strong">{profile?.backlogs ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Placement status ── */}
      <div className="fg-row fg-card">
        <h3>Placement status</h3>
        <div className="fg-cap">Visible once {data.childName} opts in to a placement drive.</div>
        <div className="fg-chip-row">
          <span className="fg-chip">Risk level: {data.riskLevel}</span>
          {data.recommendations.slice(0, 3).map((r, i) => (
            <span className="fg-chip" key={i}>{r}</span>
          ))}
        </div>
      </div>

      {/* ── Full Report Card ── */}
      {profile && (
        <div className="fg-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0 }}>Full report card</h3>
              <div className="fg-cap">Complete academic and skill profile for {data.childName}.</div>
            </div>
            <button
              onClick={handleDownloadPdf}
              style={{
                background: 'rgba(95, 163, 127, 0.15)',
                color: '#5FA37F',
                border: '1px solid rgba(95, 163, 127, 0.3)',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⬇ Export PDF
            </button>
          </div>

          <div className="fg-grid fg-g2" style={{ marginBottom: 16 }}>
            <div>
              <div className="fg-cap" style={{ marginBottom: 8, fontWeight: 600, color: 'var(--off-white)' }}>Marks</div>
              <table className="fg-table">
                <tbody>
                  {Object.entries(profile.marks).map(([subject, score]) => (
                    <tr key={subject}><td>{subject}</td><td>{score}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <div className="fg-cap" style={{ marginBottom: 8, fontWeight: 600, color: 'var(--off-white)' }}>Skills</div>
              {profile.skills.map((s) => (
                <div className="fg-skill-row" key={s.name}>
                  <span className="fg-lbl">{s.name}</span>
                  <div className="fg-skill-bar">
                    <div className={`fg-skill-fill ${s.score >= 60 ? 'strong' : 'gap'}`} style={{ width: `${s.score}%` }} />
                  </div>
                  <span className={`fg-tag ${s.score >= 60 ? 'strong' : 'gap'}`}>{s.score}</span>
                </div>
              ))}
            </div>
          </div>

          {profile.reportSummary && (
            <div className="fg-report"><strong>Summary: </strong>{profile.reportSummary}</div>
          )}

          {data.announcements.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="fg-cap" style={{ marginBottom: 8, fontWeight: 600, color: 'var(--off-white)' }}>Announcements</div>
              <div className="fg-chip-row">
                {data.announcements.map((a, i) => <span className="fg-chip" key={i}>{a}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

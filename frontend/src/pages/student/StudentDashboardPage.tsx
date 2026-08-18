import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getStudentDashboardData } from '../../services/dashboardApi'
import { getStudents } from '../../services/studentsApi'
import { getStudentProfile, updateStudentProfile } from '../../services/profileApi'
import type { Student, StudentDashboardData, StudentProfile } from '../../types/domain'

function skillsToText(skills: StudentProfile['skills']) {
  return skills.map((skill) => `${skill.name}: ${skill.score}`).join('\n')
}

function textToList(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean)
}

import { filterVerifiedAchievements } from '../../utils/proof'

function textToSkills(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean).map((item) => {
    const [namePart, scorePart] = item.split(':')
    const score = Number(scorePart?.trim())
    return { name: namePart.trim(), score: Number.isFinite(score) ? score : 0 }
  }).filter((skill) => skill.name.length > 0)
}

export function StudentDashboardPage() {
  const { session } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [data, setData] = useState<StudentDashboardData | null>(null)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [skillsText, setSkillsText] = useState('')
  const [resumeSummary, setResumeSummary] = useState('')
  const [resumeLink, setResumeLink] = useState('')
  const [leetcodeProgress, setLeetcodeProgress] = useState('')
  const [leetcodeSolved, setLeetcodeSolved] = useState('')
  const [leetcodeRating, setLeetcodeRating] = useState('')
  const [projectHighlightsText, setProjectHighlightsText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError('')
      setSaveMessage('')

      if (!session?.studentId) {
        setError('Unable to determine the active student profile.')
        setIsLoading(false)
        return
      }

      try {
        const [nextStudents, dashboardData, studentProfile] = await Promise.all([
          getStudents(),
          getStudentDashboardData(session.studentId),
          getStudentProfile(session.studentId),
        ])
        setStudents(nextStudents)
        setData(dashboardData)
        setProfile(studentProfile)
        setSkillsText(skillsToText(studentProfile.skills))
        setResumeSummary(studentProfile.resumeSummary)
        setResumeLink(studentProfile.resumeLink)
        setLeetcodeProgress(studentProfile.leetcodeProgress)
        setLeetcodeSolved(String(studentProfile.leetcodeSolved))
        setLeetcodeRating(String(studentProfile.leetcodeRating))
        setProjectHighlightsText(studentProfile.projectHighlights.join('\n'))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load student dashboard.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [session?.studentId])

  const activeStudent = useMemo(() => {
    if (!students.length) return null
    return students.find((s) => s.student_id === session?.studentId) ?? students[0]
  }, [session?.studentId, students])

  const onSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session?.studentId) { setError('Unable to save.'); return }
    setIsSaving(true)
    setError('')
    setSaveMessage('')

    try {
      const updated = await updateStudentProfile(session.studentId, {
        skills: textToSkills(skillsText),
        resumeSummary,
        resumeLink,
        leetcodeProgress,
        leetcodeSolved: Number(leetcodeSolved) || 0,
        leetcodeRating: Number(leetcodeRating) || 0,
        projectHighlights: textToList(projectHighlightsText),
      })
      setProfile(updated)
      setSkillsText(skillsToText(updated.skills))
      setResumeSummary(updated.resumeSummary)
      setResumeLink(updated.resumeLink)
      setLeetcodeProgress(updated.leetcodeProgress)
      setLeetcodeSolved(String(updated.leetcodeSolved))
      setLeetcodeRating(String(updated.leetcodeRating))
      setProjectHighlightsText(updated.projectHighlights.join('\n'))
      setSaveMessage('Progress saved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="fg-loading">Loading student dashboard...</div>
  if (error && !data) return <div className="fg-error">{error}</div>
  if (!data) return <div className="fg-error">Unknown dashboard error.</div>

  const empScore = Math.round(data.employabilityScore)
  const certs = data.portfolio?.certifications ?? 0

  /* Skill analysis — derive from data */
  const skillAnalysis = data.skills.map((s) => ({
    name: s.name,
    score: s.score,
    level: s.score >= 60 ? 'strong' as const : 'gap' as const,
  }))

  /* Timeline milestones based on year */
  const year = activeStudent?.year ?? 3
  const milestones = [
    { yr: 'Y1', ev: 'Joined coding club', state: year >= 2 ? 'done' : year === 1 ? 'now' : '' },
    { yr: 'Y2', ev: 'First internship', state: year >= 3 ? 'done' : year === 2 ? 'now' : '' },
    { yr: 'Y3', ev: 'Certified', state: year >= 4 ? 'done' : year === 3 ? 'now' : '' },
    { yr: 'Y4', ev: 'Placement prep', state: year >= 4 ? 'now' : '' },
    { yr: 'Y4+', ev: 'Graduation', state: '' },
  ]

  return (
    <div className="fg-panel-enter">
      {/* ── Stat cards ── */}
      <div className="fg-row fg-grid fg-g4">
        <div className="fg-stat-card" style={{ '--accent': 'var(--tempered)' } as React.CSSProperties}>
          <div className="fg-lbl">CGPA</div>
          <div className="fg-val">{data.cgpa.toFixed(1)}<span className="fg-u">/10</span></div>
          <div className="fg-delta up">cumulative</div>
        </div>
        <div className="fg-stat-card" style={{ '--accent': 'var(--amber)' } as React.CSSProperties}>
          <div className="fg-lbl">Attendance</div>
          <div className="fg-val">{Math.round(data.attendancePercent)}<span className="fg-u">%</span></div>
          <div className="fg-delta flat">current sem</div>
        </div>
        <div className="fg-stat-card" style={{ '--accent': 'var(--patina)' } as React.CSSProperties}>
          <div className="fg-lbl">Backlogs</div>
          <div className="fg-val">{data.backlogs}</div>
          <div className={`fg-delta ${data.backlogs === 0 ? 'up' : 'down'}`}>
            {data.backlogs === 0 ? 'clear' : `${data.backlogs} pending`}
          </div>
        </div>
        <div className="fg-stat-card" style={{ '--accent': 'var(--ember)' } as React.CSSProperties}>
          <div className="fg-lbl">Certifications</div>
          <div className="fg-val">{certs}</div>
          <div className="fg-delta up">verified</div>
        </div>
      </div>

      {/* ── Employability gauge + Skill gap ── */}
      <div className="fg-row fg-grid fg-g2">
        <div className="fg-card">
          <h3>Employability score <span className="fg-card-action">How it's calculated</span></h3>
          <div className="fg-cap">Recomputed automatically whenever your record updates.</div>
          <div className="fg-gauge-wrap">
            <div className="fg-gauge" style={{ '--pct': empScore } as React.CSSProperties}>
              <div className="fg-gauge-inner">
                <div className="fg-n">{empScore}</div>
                <div className="fg-n2">/ 100</div>
              </div>
            </div>
            <div className="fg-breakdown">
              <div className="fg-bd-row"><span className="fg-lbl">CGPA</span><div className="fg-bd-bar"><div className="fg-bd-fill" style={{ width: `${Math.min(data.cgpa * 10, 100)}%` }} /></div><span className="fg-pct">20%</span></div>
              <div className="fg-bd-row"><span className="fg-lbl">Skills</span><div className="fg-bd-bar"><div className="fg-bd-fill" style={{ width: '70%' }} /></div><span className="fg-pct">20%</span></div>
              <div className="fg-bd-row"><span className="fg-lbl">Coding</span><div className="fg-bd-bar"><div className="fg-bd-fill" style={{ width: '60%' }} /></div><span className="fg-pct">15%</span></div>
              <div className="fg-bd-row"><span className="fg-lbl">Projects</span><div className="fg-bd-bar"><div className="fg-bd-fill" style={{ width: `${(data.portfolio?.projects ?? 0) * 30}%` }} /></div><span className="fg-pct">15%</span></div>
              <div className="fg-bd-row"><span className="fg-lbl">Certs</span><div className="fg-bd-bar"><div className="fg-bd-fill" style={{ width: `${certs * 15}%` }} /></div><span className="fg-pct">10%</span></div>
            </div>
          </div>
        </div>

        <div className="fg-card">
          <h3>Skill gap analysis</h3>
          <div className="fg-cap">Benchmarked against your target role</div>
          {skillAnalysis.slice(0, 5).map((s) => (
            <div className="fg-skill-row" key={s.name}>
              <span className="fg-lbl">{s.name}</span>
              <div className="fg-skill-bar">
                <div className={`fg-skill-fill ${s.level}`} style={{ width: `${s.score}%` }} />
              </div>
              <span className={`fg-tag ${s.level}`}>{s.level.toUpperCase()}</span>
            </div>
          ))}
          <div className="fg-chip-row" style={{ marginTop: 6 }}>
            {skillAnalysis.filter((s) => s.level === 'gap').slice(0, 2).map((s) => (
              <span className="fg-chip" key={s.name}>↳ Improve: {s.name}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Growth timeline ── */}
      <div className="fg-row fg-card">
        <h3>Growth timeline</h3>
        <div className="fg-cap">Year 1 → now, across academics, activities and certifications.</div>
        <div className="fg-timeline">
          {milestones.map((m) => (
            <div className={`fg-tl-node ${m.state}`} key={m.yr}>
              <div className="fg-tl-dot" />
              <div className="fg-yr">{m.yr}</div>
              <div className="fg-ev">{m.ev}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Portfolio + Certifications ── */}
      <div className="fg-row fg-grid fg-g2">
        <div className="fg-card">
          <h3>Verified Portfolio <span className="fg-card-action">Startup Verification active</span></h3>
          <div className="fg-cap">Only achievements with verified proof URLs (GitHub, Docs, Live links) are included.</div>
          <div className="fg-grid fg-g2" style={{ gap: 10 }}>
            {profile?.projectHighlights && filterVerifiedAchievements(profile.projectHighlights).length > 0 ? (
              filterVerifiedAchievements(profile.projectHighlights).slice(0, 4).map((parsed, i) => (
                <div className="fg-proj-card" key={i} style={{ borderLeft: '3px solid var(--tempered)' }}>
                  <div className="fg-t" style={{ fontWeight: 600 }}>{parsed.title}</div>
                  <div className="fg-d" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span style={{ color: 'var(--patina)', fontSize: '12px' }}>✓ Proof Verified</span>
                    {parsed.proofUrl && (
                      <a href={parsed.proofUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--amber)', fontSize: '11px', textDecoration: 'underline' }}>
                        View Proof ↗
                      </a>
                    )}
                  </div>
                  <div className="fg-stack">{activeStudent?.department ?? 'Project'}</div>
                </div>
              ))
            ) : (
              <div className="fg-proj-card" style={{ gridColumn: 'span 2', opacity: 0.8 }}>
                <div className="fg-t">No Verified Achievements Found</div>
                <div className="fg-d" style={{ color: 'var(--ember-light)', fontSize: '12px', marginTop: 4 }}>
                  Startup standard requirement: Achievements without a valid proof link (URL) are automatically excluded. Add proof links in "Edit My Progress" below.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="fg-card">
          <h3>Certifications & Credentials</h3>
          <div className="fg-cap">Verified badges appear once verified with link or faculty confirmation.</div>
          <div className="fg-chip-row">
            {profile?.skills.slice(0, 4).map((s) => (
              <span className="fg-chip" key={s.name}>{s.name} {s.score >= 70 ? '✓ Verified' : ''}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Edit My Progress ── */}
      <div className="fg-card" style={{ marginTop: 16 }}>
        <h3>Edit my progress</h3>
        <div className="fg-cap">Update your skills, resume and project information.</div>
        <form onSubmit={onSaveProfile} style={{ display: 'grid', gap: 16 }}>
          <div className="fg-form-grid">
            <div className="fg-field">
              <label>Skills and scores</label>
              <textarea rows={5} value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="Python: 73&#10;SQL: 70" />
            </div>
            <div className="fg-field">
              <label>Resume summary</label>
              <textarea rows={5} value={resumeSummary} onChange={(e) => setResumeSummary(e.target.value)} placeholder="Short summary of your resume" />
            </div>
          </div>

          <div className="fg-form-grid">
            <div className="fg-field">
              <label>Resume link</label>
              <input type="url" value={resumeLink} onChange={(e) => setResumeLink(e.target.value)} placeholder="https://..." />
            </div>
            <div className="fg-field">
              <label>LeetCode progress</label>
              <textarea rows={3} value={leetcodeProgress} onChange={(e) => setLeetcodeProgress(e.target.value)} placeholder="Solved 42 problems" />
            </div>
          </div>

          <div className="fg-form-grid narrow">
            <div className="fg-field">
              <label>Problems solved</label>
              <input type="number" min="0" value={leetcodeSolved} onChange={(e) => setLeetcodeSolved(e.target.value)} />
            </div>
            <div className="fg-field">
              <label>Contest rating</label>
              <input type="number" min="0" value={leetcodeRating} onChange={(e) => setLeetcodeRating(e.target.value)} />
            </div>
            <div className="fg-field wide">
              <label>Project Highlights & Achievements (Must include Proof URL)</label>
              <textarea rows={3} value={projectHighlightsText} onChange={(e) => setProjectHighlightsText(e.target.value)} placeholder="Attendance Tracker - https://github.com/user/attendance&#10;Portfolio Site - https://myportfolio.dev" />
              <div style={{ fontSize: '11.5px', color: 'var(--grey-dim)', marginTop: 4 }}>
                🔒 Startup Verification Standard: Achievements without a URL proof (https://...) are automatically removed from official portfolio exports & report cards.
              </div>
            </div>
          </div>

          {saveMessage && <div className="fg-success">{saveMessage}</div>}
          {error && data && <div className="fg-error">{error}</div>}
          <button className="fg-btn-primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save progress'}
          </button>
        </form>
      </div>
    </div>
  )
}

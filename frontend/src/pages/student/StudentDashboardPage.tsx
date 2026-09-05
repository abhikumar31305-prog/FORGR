import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../context/useAuth'
import { getStudentDashboardData } from '../../services/dashboardApi'
import { getStudents } from '../../services/studentsApi'
import { getStudentProfile, updateStudentProfile, uploadStudentResume } from '../../services/profileApi'
import type { Student, StudentDashboardData, StudentProfile } from '../../types/domain'
import { filterVerifiedAchievements } from '../../utils/proof'
import { evaluatePlacementTier } from '../../utils/placementTier'
import { getScoreHistory, getStudentStreak, getWeeklyChallengeActivity, recordScoreSnapshot, type ScoreHistoryPoint } from '../../utils/dailyChallenge'
import { DailyChallengeCard } from '../../components/student/DailyChallengeCard'
import { generateVerifiedResumePdf } from '../../utils/pdfGenerator'

function skillsToText(skills: StudentProfile['skills']) {
  return skills.map((skill) => `${skill.name}: ${skill.score}`).join('\n')
}

function textToList(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean)
}

function textToSkills(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [namePart, scorePart] = item.split(':')
      const score = Number(scorePart?.trim())
      return { name: namePart.trim(), score: Number.isFinite(score) ? score : 0 }
    })
    .filter((skill) => skill.name.length > 0)
}

export function StudentDashboardPage() {
  const { session } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [data, setData] = useState<StudentDashboardData | null>(null)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [skillsText, setSkillsText] = useState('')
  const [resumeSummary, setResumeSummary] = useState('')
  const [resumeLink, setResumeLink] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [leetcodeProgress, setLeetcodeProgress] = useState('')
  const [leetcodeSolved, setLeetcodeSolved] = useState('')
  const [leetcodeRating, setLeetcodeRating] = useState('')
  const [projectHighlightsText, setProjectHighlightsText] = useState('')
  const [streak, setStreak] = useState(1)
  const [readinessBonus, setReadinessBonus] = useState(0)
  const [weeklyActivity, setWeeklyActivity] = useState<boolean[]>([])
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError('')
      setSaveMessage('')

      try {
        const nextStudents = await getStudents()
        setStudents(nextStudents)

        let effectiveStudentId = session?.studentId
        if (!effectiveStudentId && session?.email) {
          const matched = nextStudents.find(
            (s) => s.email.toLowerCase() === session.email.toLowerCase(),
          )
          effectiveStudentId = matched?.student_id
        }

        if (!effectiveStudentId) {
          setError('Unable to determine the active student profile. Please sign out and sign in again.')
          setIsLoading(false)
          return
        }

        const [dashboardData, studentProfile] = await Promise.all([
          getStudentDashboardData(effectiveStudentId),
          getStudentProfile(effectiveStudentId),
        ])
        setData(dashboardData)
        setProfile(studentProfile)
        setSkillsText(skillsToText(studentProfile.skills))
        setResumeSummary(studentProfile.resumeSummary)
        setResumeLink(studentProfile.resumeLink)
        setLeetcodeProgress(studentProfile.leetcodeProgress)
        setLeetcodeSolved(String(studentProfile.leetcodeSolved))
        setLeetcodeRating(String(studentProfile.leetcodeRating))
        setProjectHighlightsText(studentProfile.projectHighlights.join('\n'))

        const currentStreak = getStudentStreak(effectiveStudentId)
        setStreak(currentStreak)
        setWeeklyActivity(getWeeklyChallengeActivity(effectiveStudentId))
        recordScoreSnapshot(effectiveStudentId, dashboardData.employabilityScore)
        setScoreHistory(getScoreHistory(effectiveStudentId))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load student dashboard.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [session?.studentId, session?.email])

  const activeStudent = (() => {
    if (!students.length) return null
    if (session?.studentId) {
      const matched = students.find((s) => s.student_id === session.studentId)
      if (matched) return matched
    }
    if (session?.email) {
      const matched = students.find((s) => s.email.toLowerCase() === session.email.toLowerCase())
      if (matched) return matched
    }
    return null
  })()

  const onSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const targetStudentId = session?.studentId || activeStudent?.student_id
    if (!targetStudentId) {
      setError('Unable to save: active student profile not found.')
      return
    }
    setIsSaving(true)
    setError('')
    setSaveMessage('')

    try {
      const hasResumeUpload = Boolean(resumeFile)
      let savedResumeLink = resumeLink
      if (resumeFile) {
        const uploadResult = await uploadStudentResume(targetStudentId, resumeFile)
        savedResumeLink = uploadResult.resume_link
        setResumeLink(savedResumeLink)
        setResumeFile(null)
      }
      const updated = await updateStudentProfile(targetStudentId, {
        skills: textToSkills(skillsText),
        resumeSummary,
        resumeLink: savedResumeLink,
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
      setSaveMessage(hasResumeUpload ? 'Resume and profile progress saved successfully.' : 'Progress saved successfully.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save.'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="fg-loading">Loading student dashboard...</div>
  if (error && !data) return <div className="fg-error">{error}</div>
  if (!data) return <div className="fg-error">Unknown dashboard error.</div>

  const empScore = Math.min(100, Math.round(data.employabilityScore + readinessBonus))
  const certs = data.portfolio?.certifications ?? 0

  /* Skill analysis — derive from data */
  const skillAnalysis = data.skills.map((s) => ({
    name: s.name,
    score: s.score,
    level: s.score >= 60 ? ('strong' as const) : ('gap' as const),
  }))

  /* Verified projects & Tier evaluation */
  const verifiedProjects = profile?.projectHighlights ? filterVerifiedAchievements(profile.projectHighlights) : []
  const effectiveCodingScore = data.codingScore ?? (profile?.leetcodeSolved ? Math.min(300, profile.leetcodeSolved * 2) : 175)
  const portfolioCompleteness = Math.round(([
    Boolean(profile?.resumeLink),
    Boolean(profile?.resumeSummary),
    (data.portfolio?.projects ?? 0) > 0,
    (data.portfolio?.certifications ?? 0) > 0,
    (data.portfolio?.github_repositories ?? 0) > 0,
    verifiedProjects.length > 0,
  ].filter(Boolean).length / 6) * 100)
  const completedThisWeek = weeklyActivity.filter(Boolean).length
  const historyDelta = scoreHistory.length > 1 ? scoreHistory[scoreHistory.length - 1].score - scoreHistory[0].score : 0
  const improvementSuggestions = [
    !profile?.resumeLink && 'Add a public LinkedIn or portfolio link',
    verifiedProjects.length === 0 && 'Publish one project with a GitHub or demo URL',
    certs === 0 && 'Record your first certification',
    data.attendancePercent < 75 && 'Raise attendance above the 75% placement cutoff',
  ].filter(Boolean) as string[]
  const tierInfo = evaluatePlacementTier({
    cgpa: data.cgpa,
    codingScore: effectiveCodingScore,
    verifiedProjectsCount: verifiedProjects.length,
    backlogs: data.backlogs,
    attendancePercent: data.attendancePercent,
  })

  /* Timeline milestones based on year */
  const year = activeStudent?.year ?? 3
  const milestones = [
    { yr: 'Y1', ev: 'Joined coding club', state: year >= 2 ? 'done' : year === 1 ? 'now' : '' },
    { yr: 'Y2', ev: 'First internship', state: year >= 3 ? 'done' : year === 2 ? 'now' : '' },
    { yr: 'Y3', ev: 'Certified', state: year >= 4 ? 'done' : year === 3 ? 'now' : '' },
    { yr: 'Y4', ev: 'Placement prep', state: year >= 4 ? 'now' : '' },
    { yr: 'Y4+', ev: 'Graduation', state: '' },
  ]

  const handleDownloadResume = () => {
    if (activeStudent && data) {
      generateVerifiedResumePdf(activeStudent, data, profile)
    }
  }

  return (
    <div className="fg-panel-enter">
      {/* ── Student Greeting & Action Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: '22px',
        }}
      >
        <div>
          <div style={{ fontSize: '11.5px', color: 'var(--ember)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Dashboard
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--off-white)', margin: '4px 0 6px' }}>
            {(() => {
              const hour = new Date().getHours()
              const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
              const studentName = activeStudent?.name || session?.studentId || 'Student'
              return `${timeGreeting}, ${studentName}`
            })()}
          </h2>
          <div style={{ fontSize: '13.5px', color: 'var(--grey)' }}>
            Here's your current academic and placement overview.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Continuous Activity Streak Flame Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 20,
              background: 'rgba(255, 90, 40, 0.12)',
              border: '1.5px solid var(--ember)',
              color: 'var(--ember)',
              fontSize: '13px',
              fontWeight: 800,
              boxShadow: '0 2px 8px rgba(255, 90, 40, 0.15)',
            }}
            title="Consecutive days of platform activity & study"
          >
            <span style={{ fontSize: '16px' }}>🔥</span>
            <span>{streak} Day Streak</span>
          </div>

          {/* 1-Click ATS-Ready Resume PDF Download */}
          <button
            type="button"
            onClick={handleDownloadResume}
            className="fg-btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, var(--ember) 0%, #E87A3D 100%)',
              boxShadow: '0 4px 14px rgba(255, 90, 40, 0.25)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Download ATS Resume (PDF)</span>
          </button>
        </div>
      </div>

      {/* ── Stat overview cards ── */}
      <div className="fg-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        <div className="fg-stat-card" style={{ '--accent': 'var(--tempered)' } as React.CSSProperties}>
          <div className="fg-lbl">CGPA</div>
          <div className="fg-val">{data.cgpa.toFixed(2)}<span className="fg-u">/10</span></div>
          <div className="fg-delta up">cumulative score</div>
        </div>
        <div className="fg-stat-card" style={{ '--accent': data.attendancePercent < 75 ? 'var(--ember)' : 'var(--patina)' } as React.CSSProperties}>
          <div className="fg-lbl">Attendance</div>
          <div className="fg-val">{Math.round(data.attendancePercent)}<span className="fg-u">%</span></div>
          <div className={`fg-delta ${data.attendancePercent >= 75 ? 'up' : 'down'}`}>
            {data.attendancePercent >= 75 ? 'above cutoff (75%)' : 'below threshold'}
          </div>
        </div>
        <div className="fg-stat-card" style={{ '--accent': 'var(--tempered)' } as React.CSSProperties}>
          <div className="fg-lbl">Skills</div>
          <div className="fg-val">{data.skills?.length ?? 0}</div>
          <div className="fg-delta up">assessed skills</div>
        </div>
        <div className="fg-stat-card" style={{ '--accent': 'var(--ember)' } as React.CSSProperties}>
          <div className="fg-lbl">Projects</div>
          <div className="fg-val">{data.portfolio?.projects ?? verifiedProjects.length}</div>
          <div className="fg-delta up">{verifiedProjects.length} verified</div>
        </div>
        <div className="fg-stat-card" style={{ '--accent': 'var(--amber)' } as React.CSSProperties}>
          <div className="fg-lbl">Placement Readiness</div>
          <div className="fg-val">{empScore}<span className="fg-u">%</span></div>
          <div className="fg-delta up">career benchmark</div>
        </div>
        <div className="fg-stat-card" style={{ '--accent': data.backlogs === 0 && data.attendancePercent >= 75 ? 'var(--patina)' : 'var(--ember)' } as React.CSSProperties}>
          <div className="fg-lbl">Academic Status</div>
          <div className="fg-val" style={{ fontSize: '20px', lineHeight: '27px' }}>
            {data.backlogs === 0 && data.attendancePercent >= 75 ? 'On Track' : 'Attention'}
          </div>
          <div className={`fg-delta ${data.backlogs === 0 && data.attendancePercent >= 75 ? 'up' : 'down'}`}>
            {data.backlogs === 0 ? 'no active backlogs' : `${data.backlogs} backlog pending`}
          </div>
        </div>
      </div>

      {/* ── 1. Placement Tier Progression (Badges & Tiers) ── */}
      <div className="fg-card" style={{ marginBottom: '22px', position: 'relative', overflow: 'hidden' }}>
        {/* Tier Gradient Top Accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: tierInfo.color,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: 17 }}>Placement Tier Milestone</h3>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 800,
                  background: tierInfo.badgeBg,
                  color: tierInfo.color,
                  border: `1.5px solid ${tierInfo.color}`,
                }}
              >
                <span>🏆</span>
                <span>{tierInfo.tierName}</span>
                <span style={{ opacity: 0.8 }}>({tierInfo.packageRange})</span>
              </span>
            </div>
            <div className="fg-cap" style={{ marginTop: 4 }}>
              Current Category: <strong style={{ color: 'var(--off-white)' }}>{tierInfo.category}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            {tierInfo.nextTier ? (
              <div>
                <span style={{ fontSize: 12, color: 'var(--grey)' }}>Next Target Tier: </span>
                <strong style={{ fontSize: 13, color: 'var(--off-white)' }}>
                  {tierInfo.nextTierName} ({tierInfo.nextPackageRange})
                </strong>
              </div>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--patina)', fontWeight: 700 }}>
                🌟 Top Institutional Placement Bracket Achieved!
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar Toward Next Tier */}
        {tierInfo.nextTier && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: 'var(--grey)' }}>Requirements Progress toward {tierInfo.nextTierName}</span>
              <strong style={{ color: tierInfo.color }}>{tierInfo.progressToNextTier}% Completed</strong>
            </div>
            <div style={{ height: 8, background: 'var(--steel-2)', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${tierInfo.progressToNextTier}%`,
                  background: `linear-gradient(90deg, ${tierInfo.color} 0%, #60A5FA 100%)`,
                  borderRadius: 4,
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Specific Requirements Checklist */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
          Placement Prerequisite Checklist ({tierInfo.nextTierName || tierInfo.tierName})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {tierInfo.requirements.map((req) => (
            <div
              key={req.id}
              style={{
                background: 'var(--graphite)',
                padding: '10px 14px',
                borderRadius: 8,
                border: `1px solid ${req.isMet ? 'rgba(95, 163, 127, 0.4)' : 'rgba(255, 90, 40, 0.4)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--off-white)' }}>{req.label}</span>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: req.isMet ? 'rgba(95, 163, 127, 0.2)' : 'rgba(255, 90, 40, 0.2)',
                    color: req.isMet ? 'var(--patina)' : 'var(--ember)',
                  }}
                >
                  {req.isMet ? '✓ Met' : '⚠️ Pending'}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--off-white)', marginBottom: 2 }}>
                {req.currentValue} <span style={{ fontSize: 11, color: 'var(--grey)', fontWeight: 500 }}>/ req: {req.requiredValue}</span>
              </div>
              <div style={{ fontSize: 11, color: req.isMet ? 'var(--grey)' : 'var(--amber)', lineHeight: 1.3 }}>
                {req.tip}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. Daily Challenge Card & Employability Gauge ── */}
      <div className="fg-row fg-grid fg-g2" style={{ marginBottom: '22px' }}>
        {/* Daily 3-Minute Question of the Day */}
        <DailyChallengeCard
          studentId={session?.studentId || ''}
          onStreakUpdate={(newStreak) => setStreak(newStreak)}
          onScoreBoost={() => {
            setReadinessBonus((prev) => prev + 0.5)
            if (session?.studentId) setWeeklyActivity(getWeeklyChallengeActivity(session.studentId))
          }}
        />

        {/* Employability Score & Gauge */}
        <div className="fg-card">
          <h3>Employability Score <span className="fg-card-action">How it's calculated</span></h3>
          <div className="fg-cap">Recomputed continuously whenever coursework or coding practice updates.</div>
          <div className="fg-gauge-wrap">
            <div className="fg-gauge" style={{ '--pct': empScore } as React.CSSProperties}>
              <div className="fg-gauge-inner">
                <div className="fg-n">{empScore}</div>
                <div className="fg-n2">/ 100</div>
              </div>
            </div>
            <div className="fg-breakdown">
              <div className="fg-bd-row">
                <span className="fg-lbl">CGPA</span>
                <div className="fg-bd-bar"><div className="fg-bd-fill" style={{ width: `${Math.min(data.cgpa * 10, 100)}%` }} /></div>
                <span className="fg-pct">20%</span>
              </div>
              <div className="fg-bd-row">
                <span className="fg-lbl">Skills</span>
                <div className="fg-bd-bar"><div className="fg-bd-fill" style={{ width: '70%' }} /></div>
                <span className="fg-pct">20%</span>
              </div>
              <div className="fg-bd-row">
                <span className="fg-lbl">Coding</span>
                <div className="fg-bd-bar"><div className="fg-bd-fill" style={{ width: `${Math.min(effectiveCodingScore / 3, 100)}%` }} /></div>
                <span className="fg-pct">15%</span>
              </div>
              <div className="fg-bd-row">
                <span className="fg-lbl">Projects</span>
                <div className="fg-bd-bar"><div className="fg-bd-fill" style={{ width: `${Math.min(verifiedProjects.length * 25, 100)}%` }} /></div>
                <span className="fg-pct">15%</span>
              </div>
              <div className="fg-bd-row">
                <span className="fg-lbl">Certs</span>
                <div className="fg-bd-bar"><div className="fg-bd-fill" style={{ width: `${certs * 15}%` }} /></div>
                <span className="fg-pct">10%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Weekly goals and improvement history ── */}
      <div className="fg-card fg-progress-dashboard" style={{ marginBottom: '22px' }}>
        <div className="fg-progress-heading">
          <div>
            <h3 style={{ margin: 0 }}>Your weekly progress</h3>
            <div className="fg-cap">Small actions compound into placement readiness.</div>
          </div>
          <span className={`fg-progress-delta ${historyDelta >= 0 ? 'positive' : 'negative'}`}>
            {historyDelta >= 0 ? '+' : ''}{historyDelta.toFixed(1)} readiness this period
          </span>
        </div>
        <div className="fg-progress-grid">
          <div className="fg-progress-goals">
            <div className="fg-progress-goal">
              <div className="fg-progress-label"><span>Daily challenges</span><strong>{completedThisWeek}/3</strong></div>
              <div className="fg-progress-track"><div className="fg-progress-fill ember" style={{ width: `${Math.min(100, completedThisWeek / 3 * 100)}%` }} /></div>
              <span className="fg-progress-note">Three answers unlock a weekly practice badge.</span>
            </div>
            <div className="fg-progress-goal">
              <div className="fg-progress-label"><span>Portfolio completeness</span><strong>{portfolioCompleteness}%</strong></div>
              <div className="fg-progress-track"><div className="fg-progress-fill teal" style={{ width: `${portfolioCompleteness}%` }} /></div>
              <span className="fg-progress-note">Add proof, credentials, and a strong summary.</span>
            </div>
            <div className="fg-progress-goal">
              <div className="fg-progress-label"><span>Placement readiness</span><strong>{empScore}/100</strong></div>
              <div className="fg-progress-track"><div className="fg-progress-fill amber" style={{ width: `${empScore}%` }} /></div>
              <span className="fg-progress-note">Challenge answers and verified projects move this score.</span>
            </div>
          </div>
          <div className="fg-history-panel">
            <div className="fg-progress-label"><span>Recent readiness</span><strong>{scoreHistory.length ? `${scoreHistory[scoreHistory.length - 1].score}/100` : 'Building history'}</strong></div>
            <div className="fg-history-bars" aria-label="Recent employability score history">
              {scoreHistory.slice(-7).map((point) => <div className="fg-history-bar" key={point.date} style={{ height: `${Math.max(8, point.score)}%` }} title={`${point.date}: ${point.score}/100`} />)}
            </div>
            <div className="fg-progress-note">Updates once per day as your profile improves.</div>
          </div>
        </div>
        <div className="fg-next-actions">
          <strong>Best next moves</strong>
          <span>{improvementSuggestions.slice(0, 3).join(' · ') || 'Keep your streak going and deepen your strongest skill.'}</span>
        </div>
      </div>

      {/* ── Skill Matrix & Growth Timeline ── */}
      <div className="fg-row fg-grid fg-g2" style={{ marginBottom: '22px' }}>
        <div className="fg-card">
          <h3>Skill Gap Analysis</h3>
          <div className="fg-cap">Benchmarked against target engineering roles</div>
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
              <span className="fg-chip" key={s.name}>↳ Practice: {s.name}</span>
            ))}
          </div>
        </div>

        <div className="fg-card">
          <h3>Growth Timeline</h3>
          <div className="fg-cap">Year 1 → now, across coursework, coding problem solving, and projects.</div>
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
      </div>

      {/* ── 3. Verified Portfolio & Project Proof Badges ── */}
      <div className="fg-row fg-grid fg-g2" style={{ marginBottom: '22px' }}>
        <div className="fg-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <h3 style={{ margin: 0 }}>Verified Project Portfolio</h3>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                background: 'rgba(95, 163, 127, 0.15)',
                color: 'var(--patina)',
                fontWeight: 700,
                border: '1px solid rgba(95, 163, 127, 0.3)',
              }}
            >
              {verifiedProjects.length} Verified
            </span>
          </div>
          <div className="fg-cap">
            Only projects with validated GitHub or live demonstration URLs earn tier verification badges.
          </div>
          <div className="fg-grid fg-g2" style={{ gap: 10 }}>
            {verifiedProjects.length > 0 ? (
              verifiedProjects.slice(0, 4).map((parsed, i) => (
                <div className="fg-proj-card" key={i} style={{ borderLeft: '3px solid var(--tempered)' }}>
                  <div className="fg-t" style={{ fontWeight: 700, color: 'var(--off-white)' }}>{parsed.title}</div>
                  <div className="fg-d" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        color: 'var(--patina)',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(95, 163, 127, 0.12)',
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}
                    >
                      ✓ Proof Verified
                    </span>
                    {parsed.proofUrl && (
                      <a
                        href={parsed.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--amber)', fontSize: '11.5px', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        Open Proof Link ↗
                      </a>
                    )}
                  </div>
                  <div className="fg-stack" style={{ marginTop: 6 }}>{activeStudent?.department || 'Software Project'}</div>
                </div>
              ))
            ) : (
              <div className="fg-proj-card" style={{ gridColumn: 'span 2', opacity: 0.9, background: 'var(--graphite)' }}>
                <div className="fg-t" style={{ color: 'var(--amber)' }}>No Verified Proofs Recorded</div>
                <div className="fg-d" style={{ color: 'var(--grey)', fontSize: '12px', marginTop: 4 }}>
                  Add a project with a valid GitHub or demo URL in "Edit My Progress" below to unlock Gold Tier placement eligibility.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="fg-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <h3 style={{ margin: 0 }}>Certifications & Skills</h3>
            <button
              type="button"
              onClick={handleDownloadResume}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--amber)',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              Export to Resume ↗
            </button>
          </div>
          <div className="fg-cap">Technical skills validated through coursework benchmarks and lab assessments.</div>
          <div className="fg-chip-row" style={{ marginTop: 10 }}>
            {profile?.skills.slice(0, 6).map((s) => (
              <span
                className="fg-chip"
                key={s.name}
                style={{
                  border: s.score >= 70 ? '1px solid rgba(95, 163, 127, 0.4)' : '1px solid var(--line)',
                  color: s.score >= 70 ? 'var(--off-white)' : 'var(--grey)',
                }}
              >
                {s.name} {s.score >= 70 ? '✓ Verified' : `(${s.score})`}
              </span>
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              padding: '12px 14px',
              borderRadius: 8,
              background: 'var(--graphite)',
              border: '1px solid var(--line)',
              fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--off-white)', marginBottom: 4 }}>
              💡 How to reach the next tier:
            </div>
            <div style={{ color: 'var(--grey)', lineHeight: 1.4 }}>
              {tierInfo.nextTier
                ? `You need ${tierInfo.requirements.filter((r) => !r.isMet).map((r) => r.label).join(', ') || 'all criteria met'} to qualify for ${tierInfo.nextTierName}.`
                : 'You have satisfied all requirements for the highest placement bracket!'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Profile actions ── */}
      <div className="fg-card fg-profile-actions" style={{ marginTop: 16 }}>
        <h3>Profile actions</h3>
        <div className="fg-cap">Keep your resume, project proof, and coding progress ready for recruiters.</div>
        <form onSubmit={onSaveProfile} style={{ display: 'grid', gap: 16 }}>
          <div className="fg-form-grid">
            <div className="fg-field">
              <label>Skills and scores</label>
              <textarea
                rows={5}
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                placeholder="Python: 85&#10;SQL: 78&#10;Java: 70"
              />
            </div>
            <div className="fg-field">
              <label>Resume summary</label>
              <textarea
                rows={5}
                value={resumeSummary}
                onChange={(e) => setResumeSummary(e.target.value)}
                placeholder="Brief professional summary for recruiters..."
              />
            </div>
          </div>

          <div className="fg-form-grid">
            <div className="fg-field">
              <label>Resume or LinkedIn link</label>
              <input
                type="url"
                value={resumeLink}
                onChange={(e) => setResumeLink(e.target.value)}
                placeholder="https://linkedin.com/in/username"
              />
              {resumeLink && <a className="fg-inline-link" href={`${import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'}${resumeLink}`} target="_blank" rel="noreferrer">Open current resume / profile ↗</a>}
              <label htmlFor="resume-upload" className="fg-upload-label">Upload resume (PDF, DOC, DOCX)</label>
              <input
                id="resume-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
              />
              {resumeFile && <span className="fg-progress-note">Ready to upload: {resumeFile.name}</span>}
            </div>
            <div className="fg-field">
              <label>LeetCode progress notes</label>
              <textarea
                rows={3}
                value={leetcodeProgress}
                onChange={(e) => setLeetcodeProgress(e.target.value)}
                placeholder="Solved 150+ problems in Arrays, Dynamic Programming..."
              />
            </div>
          </div>

          <div className="fg-form-grid narrow">
            <div className="fg-field">
              <label>LeetCode Problems Solved</label>
              <input
                type="number"
                min="0"
                value={leetcodeSolved}
                onChange={(e) => setLeetcodeSolved(e.target.value)}
              />
            </div>
            <div className="fg-field">
              <label>Contest Rating</label>
              <input
                type="number"
                min="0"
                value={leetcodeRating}
                onChange={(e) => setLeetcodeRating(e.target.value)}
              />
            </div>
            <div className="fg-field wide">
              <label>Project Highlights (Include GitHub or Live Demo URL for Verification)</label>
              <textarea
                rows={3}
                value={projectHighlightsText}
                onChange={(e) => setProjectHighlightsText(e.target.value)}
                placeholder="E-Commerce Microservices - https://github.com/student/ecommerce&#10;ML Student Risk Predictor - https://github.com/student/forgr"
              />
              <div style={{ fontSize: '11.5px', color: 'var(--grey-dim)', marginTop: 4 }}>
                🔒 Verification Standard: Project highlights with a valid URL (https://...) earn verified badges and count directly toward Silver, Gold, and Diamond tiers.
              </div>
            </div>
          </div>

          {saveMessage && <div className="fg-success">{saveMessage}</div>}
          {error && data && <div className="fg-error">{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="fg-btn-primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Progress & Recalculate Tier'}
            </button>
            <button
              type="button"
              onClick={handleDownloadResume}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid var(--line)',
                background: 'var(--steel-2)',
                color: 'var(--off-white)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Export ATS Resume
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default StudentDashboardPage

import { useEffect, useState, type FormEvent } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SectionCard } from '../../components/ui/SectionCard'
import { StatCard } from '../../components/ui/StatCard'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { useAuth } from '../../context/useAuth'
import { getPortfolio, getSkills, updatePortfolio, updateSkills } from '../../services/featureApi'
import type { PortfolioRecord, SkillRecord } from '../../types/domain'

export function SkillsPage() {
  const { session } = useAuth()
  const [skills, setSkills] = useState<SkillRecord | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  // Form state
  const [python, setPython] = useState('75')
  const [java, setJava] = useState('70')
  const [sql, setSql] = useState('80')
  const [ml, setMl] = useState('65')
  const [ds, setDs] = useState('60')
  const [comm, setComm] = useState('85')
  const [codingScore, setCodingScore] = useState('200')

  const [projects, setProjects] = useState('3')
  const [certs, setCerts] = useState('2')
  const [githubRepos, setGithubRepos] = useState('5')
  const [githubScore, setGithubScore] = useState('45')

  useEffect(() => {
    async function load() {
      const sid = session?.studentId || '1001'
      setIsLoading(true)
      setError('')

      try {
        const [sk, po] = await Promise.all([getSkills(sid), getPortfolio(sid)])
        setSkills(sk)
        setPortfolio(po)

        if (sk) {
          setPython(String(sk.python))
          setJava(String(sk.java))
          setSql(String(sk.sql))
          setMl(String(sk.machine_learning))
          setDs(String(sk.data_science))
          setComm(String(sk.communication))
          setCodingScore(String(sk.coding_score))
        }

        if (po) {
          setProjects(String(po.projects))
          setCerts(String(po.certifications))
          setGithubRepos(String(po.github_repositories))
          setGithubScore(String(po.github_score))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load skills & portfolio.')
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
      await Promise.all([
        updateSkills(sid, {
          python: Number(python),
          java: Number(java),
          sql: Number(sql),
          machine_learning: Number(ml),
          data_science: Number(ds),
          communication: Number(comm),
          coding_score: Number(codingScore),
        }),
        updatePortfolio(sid, {
          projects: Number(projects),
          certifications: Number(certs),
          github_repositories: Number(githubRepos),
          github_score: Number(githubScore),
        }),
      ])

      const [refSk, refPo] = await Promise.all([getSkills(sid), getPortfolio(sid)])
      setSkills(refSk)
      setPortfolio(refPo)
      setSaveMessage('Skills & portfolio updated successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update skills.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="loading">Loading skills & portfolio...</div>

  const skillItems = [
    { name: 'Python', score: skills?.python ?? 0 },
    { name: 'Java', score: skills?.java ?? 0 },
    { name: 'SQL', score: skills?.sql ?? 0 },
    { name: 'Machine Learning', score: skills?.machine_learning ?? 0 },
    { name: 'Data Science', score: skills?.data_science ?? 0 },
    { name: 'Communication', score: skills?.communication ?? 0 },
  ]

  return (
    <div className="grid stagger">
      <header className="dashboard-hero">
        <p className="eyebrow">Skills & Portfolio</p>
        <h2 className="headline" style={{ fontSize: '1.8rem' }}>Technical Proficiency & Project Evidence</h2>
        <p className="subtle">Track technical skill scores, GitHub contributions, projects, and certifications.</p>
      </header>

      <section className="grid kpi">
        <StatCard title="Coding Score" value={skills?.coding_score ?? 0} subtitle="Platform assessment" />
        <StatCard title="GitHub Score" value={portfolio?.github_score ?? 0} subtitle={`${portfolio?.github_repositories ?? 0} repositories`} />
        <StatCard title="Projects Completed" value={portfolio?.projects ?? 0} subtitle="Capstone & coursework" />
        <StatCard title="Certifications" value={portfolio?.certifications ?? 0} subtitle="Verified credentials" />
      </section>

      <section className="grid two">
        <SectionCard title="Skill Breakdown">
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {skillItems.map((item) => (
              <ProgressBar key={item.name} label={item.name} value={item.score} color={item.score >= 75 ? 'var(--teal)' : item.score >= 60 ? 'var(--brand)' : 'var(--warn)'} />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Skill Comparison Chart">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={skillItems}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="name" stroke="var(--muted)" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} stroke="var(--muted)" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--ink)' }} />
              <Bar dataKey="score" fill="#7c8cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </section>

      {/* ── Edit Form (Students, Faculty & Admin have edit access) ── */}
      {session?.role === 'student' || session?.role === 'faculty' || session?.role === 'admin' ? (
        <SectionCard title="Update Skills & Portfolio Evidence">
          <form className="edit-form" onSubmit={onSave}>
            <h4>Technical & Soft Skills (0-100)</h4>
            <div className="form-grid narrow">
              <div className="field">
                <span>Python</span>
                <input type="number" min="0" max="100" value={python} onChange={(e) => setPython(e.target.value)} />
              </div>
              <div className="field">
                <span>Java</span>
                <input type="number" min="0" max="100" value={java} onChange={(e) => setJava(e.target.value)} />
              </div>
              <div className="field">
                <span>SQL</span>
                <input type="number" min="0" max="100" value={sql} onChange={(e) => setSql(e.target.value)} />
              </div>
              <div className="field">
                <span>Machine Learning</span>
                <input type="number" min="0" max="100" value={ml} onChange={(e) => setMl(e.target.value)} />
              </div>
              <div className="field">
                <span>Data Science</span>
                <input type="number" min="0" max="100" value={ds} onChange={(e) => setDs(e.target.value)} />
              </div>
              <div className="field">
                <span>Communication</span>
                <input type="number" min="0" max="100" value={comm} onChange={(e) => setComm(e.target.value)} />
              </div>
              <div className="field">
                <span>Coding Score</span>
                <input type="number" min="0" value={codingScore} onChange={(e) => setCodingScore(e.target.value)} />
              </div>
            </div>

            <h4 style={{ marginTop: '1rem' }}>Portfolio Evidence</h4>
            <div className="form-grid narrow">
              <div className="field">
                <span>Projects</span>
                <input type="number" min="0" value={projects} onChange={(e) => setProjects(e.target.value)} />
              </div>
              <div className="field">
                <span>Certifications</span>
                <input type="number" min="0" value={certs} onChange={(e) => setCerts(e.target.value)} />
              </div>
              <div className="field">
                <span>GitHub Repos</span>
                <input type="number" min="0" value={githubRepos} onChange={(e) => setGithubRepos(e.target.value)} />
              </div>
              <div className="field">
                <span>GitHub Score</span>
                <input type="number" min="0" value={githubScore} onChange={(e) => setGithubScore(e.target.value)} />
              </div>
            </div>

            {error ? <div className="error">{error}</div> : null}
            {saveMessage ? <div className="success">{saveMessage}</div> : null}
            <button className="btn btn-primary" type="submit" disabled={isSaving} style={{ marginTop: '1rem' }}>
              {isSaving ? 'Saving...' : 'Save Skills & Portfolio'}
            </button>
          </form>
        </SectionCard>
      ) : (
        <SectionCard title="Skill Profile Status">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.5rem 0' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(124,140,248,0.12)', color: 'var(--tempered)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              📊
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Verified Competency Record</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '2px' }}>
                Skill scores and GitHub portfolio links are submitted by students and validated through platform assessments and faculty mentor reviews.
              </div>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  )
}

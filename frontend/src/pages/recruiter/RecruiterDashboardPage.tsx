import { useEffect, useMemo, useState } from 'react'
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
import { getRecruiterDashboardData } from '../../services/dashboardApi'
import { getStudents } from '../../services/studentsApi'
import type { RecruiterCandidateRow, RecruiterDashboardData, Student } from '../../types/domain'

export function RecruiterDashboardPage() {
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [data, setData] = useState<RecruiterDashboardData | null>(null)
  const [branchFilter, setBranchFilter] = useState('all')
  const [minCgpa, setMinCgpa] = useState('')
  const [minEmployability, setMinEmployability] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState<RecruiterCandidateRow | null>(null)
  const [shortlist, setShortlist] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError('')

      try {
        const [loadedStudents, dashboardData] = await Promise.all([
          getStudents(),
          getRecruiterDashboardData(),
        ])
        setAllStudents(loadedStudents)
        setData(dashboardData)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load recruiter dashboard.'
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

  const filteredCandidates = useMemo(() => {
    if (!data) return []
    return data.candidates.filter((c) => {
      const branchMatch = branchFilter === 'all' || c.department === branchFilter
      const cgpaMatch = !minCgpa || (c.cgpa ?? 0) >= Number(minCgpa)
      const empMatch = !minEmployability || c.employability_score >= Number(minEmployability)
      const searchMatch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.student_id.toLowerCase().includes(searchQuery.toLowerCase())
      return branchMatch && cgpaMatch && empMatch && searchMatch
    })
  }, [branchFilter, data, minCgpa, minEmployability, searchQuery])

  const topSkillsChart = useMemo(() => {
    if (!data) return []
    return Object.entries(data.topSkills).map(([name, avg]) => ({ name, avg }))
  }, [data])

  const toggleShortlist = (studentId: string) => {
    setShortlist((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  if (isLoading) {
    return <div className="loading">Loading recruiter dashboard...</div>
  }

  if (error || !data) {
    return <div className="error">{error || 'Unknown dashboard error.'}</div>
  }

  return (
    <div className="grid stagger">
      <header className="dashboard-hero">
        <p className="eyebrow">Recruiter Dashboard</p>
        <h2 className="headline" style={{ fontSize: '1.8rem' }}>
          Candidate Browser
        </h2>
        <p className="subtle">
          Browse candidate profiles, filter by criteria, and build your shortlist.
        </p>
      </header>

      <section className="grid kpi">
        <StatCard title="Total Candidates" value={data.totalCandidates} />
        <StatCard title="Avg CGPA" value={data.avgCgpa.toFixed(2)} />
        <StatCard title="Avg Employability" value={data.avgEmployability.toFixed(1)} subtitle="Out of 100" />
        <StatCard title="Shortlisted" value={shortlist.size} subtitle="Your selection" />
      </section>

      <section className="grid two">
        <SectionCard title="Top Skills (Cohort Averages)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topSkillsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="name" stroke="var(--muted)" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} stroke="var(--muted)" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--ink)' }}
              />
              <Bar dataKey="avg" fill="#7c8cf8" radius={[6, 6, 0, 0]} name="Avg Score" />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Filters">
          <div className="grid" style={{ gap: '0.7rem' }}>
            <div className="field">
              <span>Search</span>
              <input
                type="text"
                placeholder="Name or student ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="form-grid narrow">
              <div className="field">
                <span>Branch</span>
                <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                  {branches.map((b) => (
                    <option key={b} value={b}>{b === 'all' ? 'All branches' : b}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <span>Min CGPA</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  placeholder="e.g. 7.0"
                  value={minCgpa}
                  onChange={(e) => setMinCgpa(e.target.value)}
                />
              </div>
              <div className="field">
                <span>Min Employability</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 50"
                  value={minEmployability}
                  onChange={(e) => setMinEmployability(e.target.value)}
                />
              </div>
            </div>
            <p className="subtle">{filteredCandidates.length} candidates match your criteria</p>
          </div>
        </SectionCard>
      </section>

      <SectionCard title={`Candidates (${filteredCandidates.length})`}>
        {!filteredCandidates.length ? (
          <div className="empty">No candidates match your filters.</div>
        ) : (
          <div className="candidate-grid">
            {filteredCandidates.slice(0, 30).map((c) => (
              <article
                key={c.student_id}
                className={`candidate-card card ${shortlist.has(c.student_id) ? 'shortlisted' : ''}`}
                onClick={() => setSelectedCandidate(selectedCandidate?.student_id === c.student_id ? null : c)}
              >
                <div className="candidate-header">
                  <div>
                    <h4 className="candidate-name">{c.name}</h4>
                    <p className="subtle" style={{ margin: 0, fontSize: '0.82rem' }}>
                      {c.department} · Year {c.year}
                    </p>
                  </div>
                  <button
                    className={`btn ${shortlist.has(c.student_id) ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                    onClick={(e) => { e.stopPropagation(); toggleShortlist(c.student_id) }}
                    type="button"
                  >
                    {shortlist.has(c.student_id) ? '★ Listed' : '☆ Shortlist'}
                  </button>
                </div>

                <div className="candidate-stats">
                  <div className="candidate-stat">
                    <span className="stat-title">CGPA</span>
                    <span className="stat-value-sm">{c.cgpa?.toFixed(2) ?? '—'}</span>
                  </div>
                  <div className="candidate-stat">
                    <span className="stat-title">Employability</span>
                    <span className="stat-value-sm">{c.employability_score.toFixed(1)}</span>
                  </div>
                  <div className="candidate-stat">
                    <span className="stat-title">Coding</span>
                    <span className="stat-value-sm">{c.coding_score}</span>
                  </div>
                  <div className="candidate-stat">
                    <span className="stat-title">Projects</span>
                    <span className="stat-value-sm">{c.projects}</span>
                  </div>
                </div>

                <div className="candidate-footer">
                  <span className="chip chip-ghost">{c.certifications} certs</span>
                  <span className="chip chip-ghost">GitHub: {c.github_score}</span>
                  <span className={`pill ${c.placement_probability.toLowerCase()}`}>
                    {c.placement_probability}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
        {filteredCandidates.length > 30 && (
          <p className="subtle" style={{ textAlign: 'center', marginTop: '0.8rem' }}>
            Showing 30 of {filteredCandidates.length} candidates
          </p>
        )}
      </SectionCard>

      {selectedCandidate && (
        <SectionCard title={`Profile: ${selectedCandidate.name}`}>
          <div className="detail-panel">
            <div className="grid kpi">
              <StatCard title="CGPA" value={selectedCandidate.cgpa?.toFixed(2) ?? '—'} />
              <StatCard title="Employability" value={selectedCandidate.employability_score.toFixed(1)} />
              <StatCard title="Coding Score" value={selectedCandidate.coding_score} />
              <StatCard title="GitHub Score" value={selectedCandidate.github_score} />
            </div>

            <div className="grid two">
              <div>
                <h4>Skills</h4>
                {Object.keys(selectedCandidate.skills).length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={Object.entries(selectedCandidate.skills).map(([name, score]) => ({ name, score }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                      <XAxis dataKey="name" stroke="var(--muted)" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} stroke="var(--muted)" tick={{ fontSize: 12 }} />
                      <Bar dataKey="score" fill="#2fd4c4" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="subtle">No skill data available.</p>
                )}
              </div>

              <div>
                <h4>Verified Portfolio & Credentials</h4>
                <div className="detail-chips">
                  <span className="chip chip-soft" style={{ background: 'rgba(95,163,127,0.15)', color: '#5FA37F' }}>✓ {selectedCandidate.projects} Verified Projects</span>
                  <span className="chip chip-soft" style={{ background: 'rgba(95,163,127,0.15)', color: '#5FA37F' }}>✓ {selectedCandidate.certifications} Proof Certs</span>
                  <span className="chip chip-soft">GitHub Score: {selectedCandidate.github_score}</span>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <p className="subtle">
                    Branch: {selectedCandidate.department} · Year {selectedCandidate.year}
                  </p>
                  <span className={`pill ${selectedCandidate.placement_probability.toLowerCase()}`} style={{ marginTop: '0.5rem' }}>
                    Placement: {selectedCandidate.placement_probability}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
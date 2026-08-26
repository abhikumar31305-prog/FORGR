import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SectionCard } from '../../components/ui/SectionCard'
import { StatCard } from '../../components/ui/StatCard'
import { getPlacementDashboardData } from '../../services/dashboardApi'
import { getStudents } from '../../services/studentsApi'
import type { PlacementDashboardData, Student } from '../../types/domain'

const probColor: Record<string, string> = {
  Low: '#f0546a',
  Medium: '#f2a93b',
  High: '#2fd4c4',
}

export function PlacementDashboardPage() {
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [data, setData] = useState<PlacementDashboardData | null>(null)
  const [branchFilter, setBranchFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [probFilter, setProbFilter] = useState('all')
  const [placedFilter, setPlacedFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'employability_score' | 'aptitude_score' | 'coding_score'>('employability_score')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError('')

      try {
        const [loadedStudents, dashboardData] = await Promise.all([
          getStudents(),
          getPlacementDashboardData(),
        ])
        setAllStudents(loadedStudents)
        setData(dashboardData)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load placement dashboard.'
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
    return data.candidates
      .filter((c) => {
        const branchMatch = branchFilter === 'all' || c.department === branchFilter
        const yearMatch = yearFilter === 'all' || String(c.year) === yearFilter
        const probMatch = probFilter === 'all' || c.placement_probability === probFilter
        const placedMatch =
          placedFilter === 'all' ||
          (placedFilter === 'placed' && c.placed) ||
          (placedFilter === 'not_placed' && !c.placed)
        const searchMatch =
          !searchQuery ||
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.student_id.toLowerCase().includes(searchQuery.toLowerCase())
        return branchMatch && yearMatch && probMatch && placedMatch && searchMatch
      })
      .sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0))
  }, [branchFilter, data, placedFilter, probFilter, searchQuery, sortBy, yearFilter])

  if (isLoading) {
    return <div className="loading">Loading placement dashboard...</div>
  }

  if (error || !data) {
    return <div className="error">{error || 'Unknown dashboard error.'}</div>
  }

  return (
    <div className="grid stagger">
      <header className="dashboard-hero">
        <p className="eyebrow">Placement Cell Dashboard</p>
        <h2 className="headline" style={{ fontSize: '1.8rem' }}>
          Candidate Pipeline
        </h2>
        <p className="subtle">
          Rank candidates, track placement drives, and manage shortlists.
        </p>
      </header>

      <section className="grid kpi">
        <StatCard title="Total Candidates" value={data.totalCandidates} />
        <StatCard title="Placed" value={data.placedCount} subtitle={`${data.totalCandidates > 0 ? Math.round((data.placedCount / data.totalCandidates) * 100) : 0}% rate`} />
        <StatCard title="Avg Employability" value={data.avgEmployability.toFixed(1)} subtitle="Out of 100" />
        <StatCard title="Avg Package" value={data.avgPackage > 0 ? `${data.avgPackage.toFixed(1)} LPA` : '—'} subtitle="Placed students" />
      </section>

      <section className="grid two">
        <SectionCard title="Placement Probability Distribution">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data.probabilityDistribution}
                dataKey="students"
                nameKey="level"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {data.probabilityDistribution.map((entry) => (
                  <Cell key={entry.level} fill={probColor[entry.level] ?? '#7c8cf8'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--ink)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Employability Score Bands">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.scoreBands}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="band" stroke="var(--muted)" tick={{ fontSize: 12 }} />
              <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--ink)' }}
              />
              <Bar dataKey="count" fill="#7c8cf8" radius={[6, 6, 0, 0]} name="Students" />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </section>

      <SectionCard title="Candidate Ranking">
        <div className="controls" style={{ marginBottom: '0.8rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
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
          <select value={probFilter} onChange={(e) => setProbFilter(e.target.value)}>
            <option value="all">All probabilities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <select value={placedFilter} onChange={(e) => setPlacedFilter(e.target.value)}>
            <option value="all">All status</option>
            <option value="placed">Placed</option>
            <option value="not_placed">Not placed</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
            <option value="employability_score">Sort: Employability</option>
            <option value="aptitude_score">Sort: Aptitude</option>
            <option value="coding_score">Sort: Coding</option>
          </select>
        </div>

        {!filteredCandidates.length ? (
          <div className="empty">No candidates match these filters.</div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Branch</th>
                  <th>Aptitude</th>
                  <th>Resume</th>
                  <th>Comm.</th>
                  <th>Interview</th>
                  <th>Coding</th>
                  <th>Employability</th>
                  <th>Probability</th>
                  <th>Status</th>
                  <th>Package</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.slice(0, 50).map((c) => (
                  <tr key={c.student_id}>
                    <td>{c.student_id}</td>
                    <td>{c.name}</td>
                    <td>{c.department}</td>
                    <td>{c.aptitude_score}</td>
                    <td>{c.resume_score}</td>
                    <td>{c.communication_score}</td>
                    <td>{c.interview_readiness}</td>
                    <td>{c.coding_score}</td>
                    <td>
                      <strong>{c.employability_score.toFixed(1)}</strong>
                    </td>
                    <td>
                      <span className={`pill ${c.placement_probability.toLowerCase()}`}>
                        {c.placement_probability}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${c.placed ? 'badge-success' : 'badge-muted'}`}>
                        {c.placed ? 'Placed' : 'Pending'}
                      </span>
                    </td>
                    <td>{c.placed && c.package_lpa > 0 ? `${c.package_lpa.toFixed(1)} LPA` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCandidates.length > 50 && (
              <p className="subtle" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                Showing 50 of {filteredCandidates.length} candidates
              </p>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
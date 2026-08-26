import { useEffect, useState, type FormEvent } from 'react'
import { SectionCard } from '../../components/ui/SectionCard'
import { StatCard } from '../../components/ui/StatCard'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { useAuth } from '../../context/AuthContext'
import { getPlacement, updatePlacement } from '../../services/featureApi'
import type { PlacementRecord } from '../../types/domain'

export function PlacementReadinessPage() {
  const { session } = useAuth()
  const [placement, setPlacement] = useState<PlacementRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  // Form state
  const [aptitude, setAptitude] = useState('70')
  const [resume, setResume] = useState('65')
  const [comm, setComm] = useState('75')
  const [interview, setInterview] = useState('80')
  const [employability, setEmployability] = useState('72.5')
  const [probability, setProbability] = useState('High')
  const [placed, setPlaced] = useState(false)
  const [packageLpa, setPackageLpa] = useState('0')

  useEffect(() => {
    async function load() {
      const sid = session?.studentId || '1001'
      setIsLoading(true)
      setError('')

      try {
        const data = await getPlacement(sid)
        setPlacement(data)
        if (data) {
          setAptitude(String(data.aptitude_score))
          setResume(String(data.resume_score))
          setComm(String(data.communication_score))
          setInterview(String(data.interview_readiness))
          setEmployability(String(data.employability_score))
          setProbability(data.placement_probability)
          setPlaced(data.placed)
          setPackageLpa(String(data.package_lpa))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load placement data.')
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
      await updatePlacement(sid, {
        aptitude_score: Number(aptitude),
        resume_score: Number(resume),
        communication_score: Number(comm),
        interview_readiness: Number(interview),
        employability_score: Number(employability),
        placement_probability: probability,
        placed,
        package_lpa: Number(packageLpa),
      })
      const refreshed = await getPlacement(sid)
      setPlacement(refreshed)
      setSaveMessage('Placement details updated successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update placement details.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="loading">Loading placement analytics...</div>

  const empScore = placement?.employability_score ?? 0
  const prob = placement?.placement_probability ?? 'Low'
  const isPlaced = placement?.placed ?? false

  return (
    <div className="grid stagger">
      <header className="dashboard-hero">
        <p className="eyebrow">Placement Cell Intelligence</p>
        <h2 className="headline" style={{ fontSize: '1.8rem' }}>Placement Readiness & Employability</h2>
        <p className="subtle">Evaluate aptitude, resume strength, interview readiness, and placement drive status.</p>
      </header>

      <section className="grid kpi">
        <StatCard title="Employability Score" value={empScore.toFixed(1)} subtitle="Out of 100" />
        <StatCard title="Placement Probability" value={prob} subtitle={prob === 'High' ? 'Tier 1 ready' : prob === 'Medium' ? 'Tier 2 candidate' : 'Needs preparation'} />
        <StatCard title="Interview Readiness" value={`${placement?.interview_readiness ?? 0}%`} subtitle="Mock interview score" />
        <StatCard title="Placement Status" value={isPlaced ? 'Placed 🎉' : 'In Pipeline'} subtitle={isPlaced ? `${placement?.package_lpa ?? 0} LPA Package` : 'Drive active'} />
      </section>

      <SectionCard title="Employability Breakdown">
        <div style={{ display: 'grid', gap: '0.8rem' }}>
          <ProgressBar label="Aptitude & Problem Solving" value={placement?.aptitude_score ?? 0} color="var(--brand)" />
          <ProgressBar label="Resume Score" value={placement?.resume_score ?? 0} color="var(--teal)" />
          <ProgressBar label="Communication & Behavioral" value={placement?.communication_score ?? 0} color="var(--brand)" />
          <ProgressBar label="Interview Technical Readiness" value={placement?.interview_readiness ?? 0} color="var(--teal)" />
          <ProgressBar label="Overall Employability Rating" value={empScore} color={empScore >= 70 ? 'var(--teal)' : empScore >= 50 ? 'var(--warn)' : 'var(--danger)'} />
        </div>
      </SectionCard>

      {/* ── Edit Form (Only Placement Cell, Faculty & Admin have write access) ── */}
      {session?.role === 'placement_cell' || session?.role === 'faculty' || session?.role === 'admin' ? (
        <SectionCard title="Official Placement Assessment (Placement Cell / Faculty Access)">
          <form className="edit-form" onSubmit={onSave}>
            <div className="form-grid narrow">
              <div className="field">
                <span>Aptitude Score</span>
                <input type="number" min="0" max="100" value={aptitude} onChange={(e) => setAptitude(e.target.value)} />
              </div>
              <div className="field">
                <span>Resume Score</span>
                <input type="number" min="0" max="100" value={resume} onChange={(e) => setResume(e.target.value)} />
              </div>
              <div className="field">
                <span>Communication Score</span>
                <input type="number" min="0" max="100" value={comm} onChange={(e) => setComm(e.target.value)} />
              </div>
              <div className="field">
                <span>Interview Readiness</span>
                <input type="number" min="0" max="100" value={interview} onChange={(e) => setInterview(e.target.value)} />
              </div>
              <div className="field">
                <span>Employability Score</span>
                <input type="number" step="0.1" min="0" max="100" value={employability} onChange={(e) => setEmployability(e.target.value)} />
              </div>
              <div className="field">
                <span>Placement Probability</span>
                <select value={probability} onChange={(e) => setProbability(e.target.value)}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div className="field">
                <span>Placed Status</span>
                <select value={placed ? 'true' : 'false'} onChange={(e) => setPlaced(e.target.value === 'true')}>
                  <option value="false">In Pipeline (Not Placed)</option>
                  <option value="true">Placed</option>
                </select>
              </div>
              <div className="field">
                <span>Package (LPA)</span>
                <input type="number" step="0.1" min="0" value={packageLpa} onChange={(e) => setPackageLpa(e.target.value)} />
              </div>
            </div>
            {error ? <div className="error">{error}</div> : null}
            {saveMessage ? <div className="success">{saveMessage}</div> : null}
            <button className="btn btn-primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Official Placement Record'}
            </button>
          </form>
        </SectionCard>
      ) : (
        <SectionCard title="Placement Readiness Status">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.5rem 0' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(95,163,127,0.12)', color: 'var(--patina)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              💼
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Corporate Placement Evaluation</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '2px' }}>
                Aptitude benchmarking, resume ATS scores, and company drive shortlists are evaluated by the Corporate Relations & Placement Cell.
              </div>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  )
}

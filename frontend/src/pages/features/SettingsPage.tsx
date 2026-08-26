import { useState, type FormEvent } from 'react'
import { SectionCard } from '../../components/ui/SectionCard'
import { useAuth } from '../../context/AuthContext'

export function SettingsPage() {
  const { session, logout } = useAuth()

  // Form states
  const [name, setName] = useState(session?.name || '')
  const [email] = useState(session?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [emailAlerts, setEmailAlerts] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(true)
  const [soundEffects, setSoundEffects] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const onSaveProfile = (e: FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')
    setMessage('Account settings updated successfully.')
  }

  const onChangePassword = (e: FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!currentPassword) {
      setError('Please enter your current password.')
      return
    }
    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setMessage('Password changed successfully.')
  }

  return (
    <div className="grid stagger">
      <header className="dashboard-hero">
        <p className="eyebrow">Settings & Control Panel</p>
        <h2 className="headline" style={{ fontSize: '1.8rem' }}>Account & System Preferences</h2>
        <p className="subtle">Manage your profile, change security credentials, and configure notifications.</p>
      </header>

      <section className="grid two">
        <SectionCard title="Account Details">
          <form className="edit-form" onSubmit={onSaveProfile}>
            <div className="field">
              <span>Full Name</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="field">
              <span>Email Address</span>
              <input type="email" value={email} disabled style={{ opacity: 0.7 }} />
            </div>

            <div className="form-grid">
              <div className="field">
                <span>Role</span>
                <input type="text" value={session?.role.replace('_', ' ') ?? 'User'} disabled style={{ opacity: 0.7 }} />
              </div>
              <div className="field">
                <span>Student / User ID</span>
                <input type="text" value={session?.studentId || session?.id || '—'} disabled style={{ opacity: 0.7 }} />
              </div>
            </div>

            <button className="btn btn-primary" type="submit" style={{ width: 'fit-content' }}>
              Save Account Profile
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Security & Password">
          <form className="edit-form" onSubmit={onChangePassword}>
            <div className="field">
              <span>Current Password</span>
              <input
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="form-grid">
              <div className="field">
                <span>New Password</span>
                <input
                  type="password"
                  placeholder="Min 4 chars"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="field">
                <span>Confirm New Password</span>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button className="btn btn-ghost" type="submit" style={{ width: 'fit-content' }}>
              Update Password
            </button>
          </form>
        </SectionCard>
      </section>

      <SectionCard title="Notification & Preference Options">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} style={{ width: '18px', height: '18px' }} />
            <div>
              <strong>Email Risk Alerts</strong>
              <p className="subtle" style={{ margin: 0, fontSize: '0.85rem' }}>Receive instant email notifications when attendance or backlog risk increases.</p>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={weeklyDigest} onChange={(e) => setWeeklyDigest(e.target.checked)} style={{ width: '18px', height: '18px' }} />
            <div>
              <strong>Weekly Performance Digest</strong>
              <p className="subtle" style={{ margin: 0, fontSize: '0.85rem' }}>Get a weekly summary of CGPA, skills, and placement readiness updates.</p>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={soundEffects} onChange={(e) => setSoundEffects(e.target.checked)} style={{ width: '18px', height: '18px' }} />
            <div>
              <strong>Dashboard Interaction Haptics / Sounds</strong>
              <p className="subtle" style={{ margin: 0, fontSize: '0.85rem' }}>Enable subtle audio feedback when saving changes.</p>
            </div>
          </label>
        </div>
      </SectionCard>

      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}

      <SectionCard title="Session Control">
        <p className="subtle">Active session ID: {session?.accessToken.slice(0, 20)}...</p>
        <button className="btn btn-ghost" type="button" onClick={logout} style={{ color: 'var(--danger)', borderColor: 'rgba(240, 84, 106, 0.3)' }}>
          Sign Out of FORGR Platform
        </button>
      </SectionCard>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { changePasswordApi } from '../../services/authApi'
import { useAuth } from '../../context/useAuth'

interface UpdatePasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UpdatePasswordModal({ isOpen, onClose }: UpdatePasswordModalProps) {
  const { session } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!isOpen) return null

  const handleResetForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
    setSuccess(null)
  }

  const handleClose = () => {
    if (!isLoading) {
      handleResetForm()
      onClose()
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!currentPassword) {
      setError('Please provide your current password.')
      return
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    try {
      setIsLoading(true)
      const res = await changePasswordApi(currentPassword, newPassword)
      setSuccess(res.message || 'Password successfully updated!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Please verify your current password.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 10, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          padding: '1.75rem',
          boxShadow: 'var(--shadow-lg)',
          color: 'var(--text)',
          fontFamily: 'inherit',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.3rem' }}>🔐</span>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>
                Update Password
              </h3>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-subtle)' }}>
              Change credentials for <strong style={{ color: 'var(--text)' }}>{session?.email}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            style={{
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(255, 90, 40, 0.12)',
              border: '1px solid rgba(255, 90, 40, 0.35)',
              color: 'var(--accent)',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(95, 163, 127, 0.15)',
              border: '1px solid rgba(95, 163, 127, 0.4)',
              color: '#5FA37F',
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Current Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.35rem' }}>
              Current Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                style={{
                  width: '100%',
                  padding: '0.65rem 2.5rem 0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-subtle)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-subtle)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  padding: '4px',
                }}
              >
                {showCurrent ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>
                New Password
              </label>
              <span style={{ fontSize: '0.72rem', color: newPassword.length >= 6 ? '#5FA37F' : 'var(--text-subtle)' }}>
                {newPassword.length >= 6 ? '✓ 6+ chars' : 'Min 6 characters'}
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create new password"
                style={{
                  width: '100%',
                  padding: '0.65rem 2.5rem 0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-subtle)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-subtle)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  padding: '4px',
                }}
              >
                {showNew ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>
                Confirm New Password
              </label>
              {confirmPassword && (
                <span style={{ fontSize: '0.72rem', color: newPassword === confirmPassword ? '#5FA37F' : '#ff6b57', fontWeight: 600 }}>
                  {newPassword === confirmPassword ? '✓ Passwords match' : '✕ Does not match'}
                </span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                style={{
                  width: '100%',
                  padding: '0.65rem 2.5rem 0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-subtle)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-subtle)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  padding: '4px',
                }}
              >
                {showConfirm ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '0.7rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text)',
                fontWeight: 600,
                fontSize: '0.86rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !currentPassword || !newPassword || newPassword !== confirmPassword}
              style={{
                flex: 1.5,
                padding: '0.7rem',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--accent)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: isLoading || !currentPassword || !newPassword || newPassword !== confirmPassword ? 'not-allowed' : 'pointer',
                opacity: isLoading || !currentPassword || !newPassword || newPassword !== confirmPassword ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(255, 90, 40, 0.3)',
              }}
            >
              {isLoading ? 'Updating...' : 'Set New Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

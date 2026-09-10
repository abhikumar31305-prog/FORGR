import React, { useState } from 'react'

interface RazorpaySandboxModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  amountInr: number
  planName: string
  billingCycle: string
  profileLimit: number
  onPaymentSuccess: (orderId: string, paymentId: string, signature: string) => Promise<void>
  onPaymentFailure?: (errorMsg: string) => void
}

export const RazorpaySandboxModal: React.FC<RazorpaySandboxModalProps> = ({
  isOpen,
  onClose,
  orderId,
  amountInr,
  planName,
  billingCycle,
  profileLimit,
  onPaymentSuccess,
  onPaymentFailure,
}) => {
  const [activeTab, setActiveTab] = useState<'card' | 'upi' | 'netbanking'>('card')
  const [cardNumber] = useState('4111 1111 1111 1111')
  const [expiry] = useState('12/28')
  const [cvv] = useState('123')
  const [upiVpa, setUpiVpa] = useState('success@razorpay')
  const [selectedBank, setSelectedBank] = useState('HDFC')
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [authStep, setAuthStep] = useState('')
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  if (!isOpen) return null

  const handleCompletePayment = async () => {
    setIsAuthorizing(true)
    setStatusMessage(null)
    try {
      setAuthStep('1/3 Contacting Razorpay Gateway...')
      await new Promise((r) => setTimeout(r, 450))

      if (activeTab === 'upi' && upiVpa.includes('fail')) {
        throw new Error('UPI Transaction declined by VPA bank (failure@razorpay simulated).')
      }

      setAuthStep('2/3 Cryptographic HMAC signature generation...')
      await new Promise((r) => setTimeout(r, 400))

      const paymentId = `pay_sim_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`
      const signature = `sim_sig_${orderId}`

      setAuthStep('3/3 Verifying with backend & activating subscription...')
      await onPaymentSuccess(orderId, paymentId, signature)

      setStatusMessage({
        type: 'success',
        text: '✓ Payment captured & institutional subscription activated!',
      })
      await new Promise((r) => setTimeout(r, 800))
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sandbox authorization failed.'
      setStatusMessage({ type: 'error', text: msg })
      if (onPaymentFailure) onPaymentFailure(msg)
    } finally {
      setIsAuthorizing(false)
      setAuthStep('')
    }
  }

  const handleSimulateDecline = () => {
    setIsAuthorizing(true)
    setAuthStep('Simulating gateway decline...')
    setTimeout(() => {
      setIsAuthorizing(false)
      setAuthStep('')
      const msg = 'Payment declined: 1004 Card issuer refused authorization (Simulation).'
      setStatusMessage({ type: 'error', text: msg })
      if (onPaymentFailure) onPaymentFailure(msg)
    }, 600)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(5, 7, 10, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isAuthorizing) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'linear-gradient(165deg, #17191D 0%, #111215 100%)',
          borderRadius: '16px',
          border: '1px solid #2B303B',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          color: '#ECEAE5',
          fontFamily: 'inherit',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header with Razorpay & FORGR Branding */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(135deg, #091C36 0%, #0D264A 100%)',
            borderBottom: '1px solid #1A3E6D',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#2B84EA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                color: '#FFFFFF',
                fontSize: '1.1rem',
                boxShadow: '0 2px 10px rgba(43, 132, 234, 0.4)',
              }}
            >
              ⚡
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.02em', color: '#FFFFFF' }}>
                  Razorpay Checkout
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    background: 'rgba(242, 169, 59, 0.2)',
                    color: '#f2a93b',
                    border: '1px solid rgba(242, 169, 59, 0.4)',
                  }}
                >
                  TEST SANDBOX
                </span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#97B3D4', marginTop: '1px' }}>
                FORGR Platform Institutional Subscription
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isAuthorizing}
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#97B3D4',
              fontSize: '1.4rem',
              cursor: isAuthorizing ? 'not-allowed' : 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Order Price & Details Strip */}
        <div
          style={{
            padding: '1rem 1.5rem',
            background: 'rgba(0, 0, 0, 0.25)',
            borderBottom: '1px solid #20242C',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle, #888)' }}>Selected Plan:</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ECEAE5' }}>
              {planName} ({profileLimit.toLocaleString()} Profiles)
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6fc797', marginTop: '2px' }}>
              {billingCycle === 'yearly' ? 'Annual Subscription (20% Savings)' : 'Monthly Subscription'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle, #888)' }}>Amount to Pay:</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'monospace' }}>
              ₹{amountInr.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Status / Alert Banner */}
        {statusMessage && (
          <div
            style={{
              margin: '0.9rem 1.5rem 0',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background:
                statusMessage.type === 'error' ? 'rgba(255, 90, 40, 0.15)' : 'rgba(95, 163, 127, 0.18)',
              border:
                statusMessage.type === 'error'
                  ? '1px solid rgba(255, 90, 40, 0.35)'
                  : '1px solid rgba(95, 163, 127, 0.4)',
              color: statusMessage.type === 'error' ? '#ff6b57' : '#6fc797',
            }}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Payment Tabs */}
        <div style={{ padding: '1rem 1.5rem 1.5rem' }}>
          <div
            style={{
              display: 'flex',
              gap: '6px',
              background: '#0D0E11',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid #232730',
              marginBottom: '1.25rem',
            }}
          >
            {(['card', 'upi', 'netbanking'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                disabled={isAuthorizing}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === tab ? 700 : 500,
                  background: activeTab === tab ? '#1F242D' : 'transparent',
                  color: activeTab === tab ? '#FFFFFF' : '#8A91A0',
                  cursor: isAuthorizing ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>{tab === 'card' ? '💳' : tab === 'upi' ? '📱' : '🏦'}</span>
                <span>{tab === 'card' ? 'Card' : tab === 'upi' ? 'UPI / QR' : 'Netbanking'}</span>
              </button>
            ))}
          </div>

          {/* Tab 1: Card Content */}
          {activeTab === 'card' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#97A1B2', marginBottom: '4px' }}>
                  Card Number (Test Visa):
                </label>
                <div
                  style={{
                    background: '#0A0C0E',
                    border: '1px solid #262B35',
                    borderRadius: '8px',
                    padding: '0.65rem 0.9rem',
                    fontFamily: 'monospace',
                    fontSize: '0.95rem',
                    color: '#ECEAE5',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{cardNumber}</span>
                  <span style={{ fontSize: '0.72rem', background: '#1A3356', color: '#7EB1F7', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    VISA TEST
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: '#97A1B2', marginBottom: '4px' }}>
                    Valid Thru:
                  </label>
                  <div
                    style={{
                      background: '#0A0C0E',
                      border: '1px solid #262B35',
                      borderRadius: '8px',
                      padding: '0.65rem 0.9rem',
                      fontFamily: 'monospace',
                      fontSize: '0.92rem',
                      color: '#ECEAE5',
                    }}
                  >
                    {expiry}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: '#97A1B2', marginBottom: '4px' }}>
                    CVV:
                  </label>
                  <div
                    style={{
                      background: '#0A0C0E',
                      border: '1px solid #262B35',
                      borderRadius: '8px',
                      padding: '0.65rem 0.9rem',
                      fontFamily: 'monospace',
                      fontSize: '0.92rem',
                      color: '#ECEAE5',
                    }}
                  >
                    {cvv}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#7E8B9E', background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: '6px' }}>
                💡 <em>Test Mode Sandbox:</em> All card details are prefilled for instant evaluation. OTP <strong>123456</strong> is auto-approved.
              </div>
            </div>
          )}

          {/* Tab 2: UPI Content */}
          {activeTab === 'upi' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#97A1B2', marginBottom: '4px' }}>
                  UPI Virtual Payment Address (VPA):
                </label>
                <input
                  type="text"
                  value={upiVpa}
                  onChange={(e) => setUpiVpa(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0A0C0E',
                    border: '1px solid #262B35',
                    borderRadius: '8px',
                    padding: '0.65rem 0.9rem',
                    fontFamily: 'monospace',
                    fontSize: '0.92rem',
                    color: '#ECEAE5',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['success@razorpay', 'failure@razorpay'].map((vpa) => (
                  <button
                    key={vpa}
                    type="button"
                    onClick={() => setUpiVpa(vpa)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      border: upiVpa === vpa ? '1px solid var(--accent, #ff5a28)' : '1px solid #282C34',
                      background: upiVpa === vpa ? 'rgba(255, 90, 40, 0.15)' : '#0F1115',
                      color: upiVpa === vpa ? '#ff7547' : '#97A1B2',
                      cursor: 'pointer',
                    }}
                  >
                    {vpa.includes('fail') ? '❌ ' : '✓ '} {vpa}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: '0.75rem', color: '#7E8B9E', background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: '6px' }}>
                Select <code>success@razorpay</code> to approve, or <code>failure@razorpay</code> to test refusal.
              </div>
            </div>
          )}

          {/* Tab 3: Netbanking Content */}
          {activeTab === 'netbanking' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#97A1B2', marginBottom: '2px' }}>
                Select Simulated Test Bank:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank'].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setSelectedBank(b)}
                    style={{
                      padding: '0.65rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: selectedBank === b ? '1px solid #2B84EA' : '1px solid #232730',
                      background: selectedBank === b ? 'rgba(43, 132, 234, 0.15)' : '#0A0C0E',
                      color: selectedBank === b ? '#7EB1F7' : '#8A91A0',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    🏛️ {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              disabled={isAuthorizing}
              onClick={handleCompletePayment}
              style={{
                width: '100%',
                padding: '0.85rem 1.2rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #072654 0%, #0c2340 100%)',
                border: '1px solid #144272',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.98rem',
                cursor: isAuthorizing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(7, 38, 84, 0.5)',
                transition: 'transform 0.1s ease',
              }}
            >
              <span>⚡</span>
              <span>
                {isAuthorizing && authStep ? authStep : `Pay ₹${amountInr.toLocaleString()} (Authorize Sandbox)`}
              </span>
            </button>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                type="button"
                disabled={isAuthorizing}
                onClick={handleSimulateDecline}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px dashed #3D2220',
                  color: '#C7756D',
                  fontSize: '0.78rem',
                  cursor: isAuthorizing ? 'not-allowed' : 'pointer',
                }}
              >
                Simulate Bank Decline
              </button>
              <button
                type="button"
                disabled={isAuthorizing}
                onClick={onClose}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  background: '#1A1C20',
                  border: '1px solid #282C34',
                  color: '#8A91A0',
                  fontSize: '0.78rem',
                  cursor: isAuthorizing ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

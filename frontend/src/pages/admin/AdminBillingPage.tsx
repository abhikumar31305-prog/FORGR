import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getBillingPlans,
  getSubscriptionStatus,
  createRazorpayOrder,
  verifyPayment,
  getPaymentTransactions,
  simulateTestSubscription,
  loadRazorpayScript,
  type BillingPlan,
  type SubscriptionStatus,
  type TransactionItem,
} from '../../services/billingApi'
import { SectionCard } from '../../components/ui/SectionCard'
import { RazorpaySandboxModal } from '../../components/admin/RazorpaySandboxModal'


export function AdminBillingPage() {
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly')
  const [customProfiles, setCustomProfiles] = useState(1200)
  const [, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showTestGuide, setShowTestGuide] = useState(true)
  const [gatewayInfo, setGatewayInfo] = useState<{ mode: string; keyId: string }>({ mode: 'test', keyId: '' })
  const [sandboxModal, setSandboxModal] = useState<{
    isOpen: boolean
    orderId: string
    amountInr: number
    planName: string
    billingCycle: string
    profileLimit: number
  }>({
    isOpen: false,
    orderId: '',
    amountInr: 0,
    planName: '',
    billingCycle: 'yearly',
    profileLimit: 2500,
  })

  const loadData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const [plansRes, statusRes, txRes] = await Promise.all([
        getBillingPlans(),
        getSubscriptionStatus(),
        getPaymentTransactions(),
      ])
      setPlans(plansRes.plans)
      setStatus(statusRes)
      setTransactions(txRes)
      setGatewayInfo({
        mode: statusRes.gateway_mode || plansRes.gateway_mode || (statusRes.is_simulation_mode ? 'simulation' : 'test'),
        keyId: statusRes.razorpay_key_id || plansRes.razorpay_key_id || '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve billing and subscription status.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const init = async () => {
      try {
        const [plansRes, statusRes, txRes] = await Promise.all([
          getBillingPlans(),
          getSubscriptionStatus(),
          getPaymentTransactions(),
        ])
        if (!active) return
        setPlans(plansRes.plans)
        setStatus(statusRes)
        setTransactions(txRes)
        setGatewayInfo({
          mode: statusRes.gateway_mode || plansRes.gateway_mode || (statusRes.is_simulation_mode ? 'simulation' : 'test'),
          keyId: statusRes.razorpay_key_id || plansRes.razorpay_key_id || '',
        })
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to retrieve billing and subscription status.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void init()
    void loadRazorpayScript()
    return () => {
      active = false
    }
  }, [])

  const handleSubscribe = async (planId: string, profileCount?: number) => {
    setIsProcessing(true)
    setError('')
    setSuccessMessage('')

    try {
      // 1. Create order on backend
      const order = await createRazorpayOrder(planId, billingCycle, profileCount)

      // 2. In Simulation / Test mode with sandbox keys, pop up interactive test checkout
      if (order.is_simulation) {
        setIsProcessing(false)
        const planObj = plans.find((p) => p.id === planId)
        setSandboxModal({
          isOpen: true,
          orderId: order.order_id,
          amountInr: order.amount_inr,
          planName: planObj ? planObj.name : planId === 'custom' ? 'Custom Cohort Plan' : planId.toUpperCase(),
          billingCycle: billingCycle,
          profileLimit: order.profile_limit,
        })
        return
      }

      // 3. Live or authenticated test mode uses official Razorpay Checkout SDK
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Razorpay checkout could not load. Check network connection or ad-blockers and try again.')
      }

      if (window.Razorpay) {
        const options = {
          key: order.key_id,
          amount: order.amount_paise,
          currency: order.currency,
          name: 'FORGR Platform',
          description: `Subscription: ${planId.toUpperCase()} (${billingCycle.toUpperCase()}) - ${order.profile_limit} Profiles`,
          order_id: order.order_id,
          handler: async (response: {
            razorpay_order_id: string
            razorpay_payment_id: string
            razorpay_signature: string
          }) => {
            try {
              const res = await verifyPayment(
                response.razorpay_order_id,
                response.razorpay_payment_id,
                response.razorpay_signature,
              )
              setSuccessMessage(res.message)
              await loadData()
            } catch (vErr) {
              setError(vErr instanceof Error ? vErr.message : 'Payment verification failed.')
            } finally {
              setIsProcessing(false)
            }
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false)
            },
          },
          prefill: {
            email: status?.admin_email || 'admin@forgr.app',
          },
          theme: {
            color: '#FF5A28',
          },
        }
        const rzp = new window.Razorpay(options)
        rzp.on('payment.failed', (response: { error?: { description?: string; reason?: string } }) => {
          setError(`Payment Failed: ${response.error?.description || response.error?.reason || 'Transaction declined.'}`)
          setIsProcessing(false)
        })
        rzp.open()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate Razorpay subscription.')
      setIsProcessing(false)
    }
  }

  const handleInstantActivate = async (planId: string, profileLimit: number) => {
    setIsProcessing(true)
    setError('')
    setSuccessMessage('')
    try {
      const res = await simulateTestSubscription(planId, billingCycle, profileLimit, false)
      setSuccessMessage(`⚡ Instant Test Activation: ${planId.toUpperCase()} tier is now active for up to ${res.profile_limit.toLocaleString()} managed profiles!`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Instant activation failed.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSandboxPaymentSuccess = async (orderId: string, paymentId: string, signature: string) => {
    try {
      const res = await verifyPayment(orderId, paymentId, signature)
      setSuccessMessage(`✓ Razorpay Sandbox Payment Verified! ${res.message}`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment verification failed.')
      throw err
    } finally {
      setIsProcessing(false)
    }
  }

  const handleToggleTestExpiry = async (expire: boolean) => {
    try {
      await simulateTestSubscription('starter', 'monthly', 500, expire)
      await loadData()
      if (expire) {
        setError('Subscription marked as EXPIRED for demonstration. Bulk imports will now request payment.')
      } else {
        setSuccessMessage('Subscription activated for demonstration.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle test state.')
    }
  }

  // Custom profile pricing calculation
  const customRate = customProfiles <= 500 ? 12 : customProfiles <= 2500 ? 8 : 5
  const customMonthly = Math.round(customProfiles * customRate)
  const customAmount = billingCycle === 'yearly' ? Math.round(customMonthly * 12 * 0.8) : customMonthly

  return (
    <div className="grid stagger" style={{ gap: '1.5rem' }}>
      {/* ── Page Header ── */}
      <header className="dashboard-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
            <p className="eyebrow" style={{ margin: 0 }}>Enterprise Data Validation & Cohort Scaling</p>
            {gatewayInfo.mode === 'test' && (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(232, 162, 61, 0.18)',
                color: '#f2a93b',
                border: '1px solid rgba(232, 162, 61, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}>
                ⚡ Razorpay Test Mode ({gatewayInfo.keyId ? `${gatewayInfo.keyId.substring(0, 12)}...` : 'rzp_test_...'})
              </span>
            )}
            {gatewayInfo.mode === 'simulation' && (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(95, 168, 196, 0.18)',
                color: '#7bc8e2',
                border: '1px solid rgba(95, 168, 196, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}>
                🧪 Gateway Simulator (Mock)
              </span>
            )}
            {gatewayInfo.mode === 'live' && (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(95, 163, 127, 0.18)',
                color: '#6fc797',
                border: '1px solid rgba(95, 163, 127, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}>
                🔒 Razorpay Live
              </span>
            )}
          </div>
          <h1 className="headline" style={{ fontSize: '2.2rem', margin: '0.2rem 0' }}>Institutional Subscription & Billing</h1>
          <p className="subtle" style={{ fontSize: '0.95rem' }}>
            Scale your student profile capacity, extend validation validity, and manage Razorpay institutional billing.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="button"
            onClick={() => setShowTestGuide(!showTestGuide)}
            style={{
              border: '1px solid rgba(232, 162, 61, 0.4)',
              background: showTestGuide ? 'rgba(232, 162, 61, 0.15)' : 'var(--surface-subtle)',
              color: '#f2a93b',
              borderRadius: '8px',
              padding: '0.5rem 0.9rem',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            {showTestGuide ? '✕ Hide Test Guide' : '💡 Razorpay Test Guide'}
          </button>
          <Link to="/admin/bulk-import" className="button" style={{ background: 'var(--accent)', color: '#FFFFFF', fontWeight: 700, borderRadius: '8px', border: 'none', padding: '0.5rem 1.1rem' }}>
            📥 Bulk Data Import
          </Link>
          <Link to="/admin" className="button" style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--text)', borderRadius: '8px', padding: '0.5rem 1.1rem' }}>
            Admin Dashboard
          </Link>
        </div>
      </header>

      {/* ── Status Alerts ── */}
      {error && (
        <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(255, 90, 40, 0.12)', border: '1px solid rgba(255, 90, 40, 0.35)', color: '#ff7547', fontSize: '0.9rem' }}>
          ⚠️ {error}
        </div>
      )}

      {successMessage && (
        <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(95, 163, 127, 0.15)', border: '1px solid rgba(95, 163, 127, 0.35)', color: '#6fc797', fontSize: '0.9rem', fontWeight: 600 }}>
          {successMessage}
        </div>
      )}

      {/* ── Razorpay Test Mode Helper Card ── */}
      {showTestGuide && (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid rgba(232, 162, 61, 0.4)',
          borderRadius: '12px',
          padding: '1.2rem',
          boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>💳</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text)' }}>Razorpay Gateway Test Mode Integration Guide</strong>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
              Active Mode: <strong style={{ color: '#f2a93b' }}>{gatewayInfo.mode.toUpperCase()}</strong>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
            {/* Box 1: Test Cards */}
            <div style={{ background: 'var(--surface-subtle)', padding: '0.9rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, color: '#f2a93b', marginBottom: '0.4rem' }}>🃏 Test Card Credentials</div>
              <p style={{ margin: '0 0 0.4rem 0', color: 'var(--text-subtle)', fontSize: '0.8rem' }}>
                Use these mock credentials in the Razorpay Checkout pop-up:
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.6', color: 'var(--text)' }}>
                <li>Card Number: <code style={{ color: '#5FA37F', background: 'var(--card-bg)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', fontWeight: 600 }}>4111 1111 1111 1111</code></li>
                <li>Expiry: <code style={{ color: '#5FA37F', background: 'var(--card-bg)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', fontWeight: 600 }}>12/28</code> (any future date)</li>
                <li>CVV: <code style={{ color: '#5FA37F', background: 'var(--card-bg)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', fontWeight: 600 }}>123</code> | OTP: <code style={{ color: '#5FA37F', background: 'var(--card-bg)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', fontWeight: 600 }}>123456</code></li>
              </ul>
            </div>

            {/* Box 2: UPI & Netbanking */}
            <div style={{ background: 'var(--surface-subtle)', padding: '0.9rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, color: '#5FA37F', marginBottom: '0.4rem' }}>📱 Test UPI & Netbanking</div>
              <p style={{ margin: '0 0 0.4rem 0', color: 'var(--text-subtle)', fontSize: '0.8rem' }}>
                Razorpay sandbox supports instant UPI verification:
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.6', color: 'var(--text)' }}>
                <li>Instant Success UPI: <code style={{ color: '#5FA37F', background: 'var(--card-bg)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', fontWeight: 600 }}>success@razorpay</code></li>
                <li>Failure Test UPI: <code style={{ color: '#ff6b57', background: 'var(--card-bg)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', fontWeight: 600 }}>failure@razorpay</code></li>
                <li>Netbanking: Select any test bank, then click <em>Success</em> on Razorpay frame.</li>
              </ul>
            </div>

            {/* Box 3: Setup Instructions */}
            <div style={{ background: 'var(--surface-subtle)', padding: '0.9rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, color: '#5FA8C4', marginBottom: '0.4rem' }}>🔑 Connect Your Razorpay Keys</div>
              <ol style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.5', color: 'var(--text)', fontSize: '0.8rem' }}>
                <li>Sign in to <a href="https://dashboard.razorpay.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>dashboard.razorpay.com</a>.</li>
                <li>Switch to <strong>Test Mode</strong> in top bar.</li>
                <li>Go to <strong>Settings</strong> → <strong>API Keys</strong> → <strong>Generate Key</strong>.</li>
                <li>Paste keys in <code style={{ color: '#f2a93b' }}>.env</code>:
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', background: 'var(--card-bg)', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border)', marginTop: '4px', color: 'var(--text)' }}>
                    RAZORPAY_KEY_ID=rzp_test_...<br />
                    RAZORPAY_KEY_SECRET=...
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ── Current Subscription Status Banner ── */}
      {status && (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-card)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '3px 10px',
                borderRadius: '20px',
                background: status.status === 'active' ? 'rgba(95, 163, 127, 0.18)' : status.status === 'trialing' ? 'rgba(232, 162, 61, 0.18)' : 'rgba(255, 90, 40, 0.18)',
                color: status.status === 'active' ? '#6fc797' : status.status === 'trialing' ? '#f2a93b' : '#ff6b57',
                border: `1px solid ${status.status === 'active' ? 'rgba(95, 163, 127, 0.35)' : status.status === 'trialing' ? 'rgba(232, 162, 61, 0.35)' : 'rgba(255, 90, 40, 0.35)'}`,
              }}>
                ● {status.status.toUpperCase()}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                {status.billing_cycle === 'yearly' ? 'Annual Cycle' : 'Monthly Cycle'}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', color: 'var(--text)' }}>
              {status.plan_name}
            </h2>
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.86rem', color: 'var(--text-subtle)' }}>
              {status.status === 'active' && status.current_period_end
                ? `Active through ${new Date(status.current_period_end).toLocaleDateString()} (${status.days_remaining} days remaining)`
                : status.status === 'trialing' && status.trial_end
                ? `14-Day Evaluation expires ${new Date(status.trial_end).toLocaleDateString()} (${status.days_remaining} days remaining)`
                : 'Plan expired — Please renew to enable full cohort validation.'}
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-subtle)' }}>Managed Profiles Capacity:</span>
              <strong style={{ color: status.quota_exceeded ? '#ff6b57' : 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                {status.current_profiles.toLocaleString()} / {status.profile_limit.toLocaleString()}
              </strong>
            </div>
            <div style={{ height: '8px', background: 'var(--steel-3)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (status.current_profiles / Math.max(1, status.profile_limit)) * 100)}%`,
                background: status.quota_exceeded ? '#ff5a28' : 'linear-gradient(90deg, #5FA37F, #5FA8C4)',
                borderRadius: '4px',
                transition: 'width 0.4s ease',
              }} />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              {status.quota_exceeded
                ? '⚠️ Profile limit exceeded. Upgrade tier to continue bulk importing.'
                : `${status.profile_limit - status.current_profiles} available profile slots.`}
            </div>
          </div>

          {/* Quick Demo Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Evaluation Simulator:
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="button"
                onClick={() => handleToggleTestExpiry(false)}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', border: '1px solid rgba(95, 163, 127, 0.4)', background: 'rgba(95, 163, 127, 0.1)', color: '#6fc797' }}
              >
                Simulate Active Plan
              </button>
              <button
                type="button"
                className="button"
                onClick={() => handleToggleTestExpiry(true)}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', border: '1px solid rgba(255, 90, 40, 0.4)', background: 'rgba(255, 90, 40, 0.1)', color: '#ff7547' }}
              >
                Simulate Expired
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Billing Cycle Toggle ── */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
        <span style={{ fontSize: '0.95rem', fontWeight: billingCycle === 'monthly' ? 700 : 400, color: billingCycle === 'monthly' ? 'var(--text)' : 'var(--text-subtle)' }}>
          Monthly Billing
        </span>
        <button
          type="button"
          aria-label="Toggle Billing Cycle"
          onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
          style={{
            width: '52px',
            height: '28px',
            borderRadius: '14px',
            background: billingCycle === 'yearly' ? 'var(--accent)' : 'var(--steel-3)',
            border: '1px solid var(--border)',
            position: 'relative',
            cursor: 'pointer',
            padding: 0,
            transition: 'background 0.2s ease',
          }}
        >
          <div style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: '#FFFFFF',
            position: 'absolute',
            top: '2px',
            left: billingCycle === 'yearly' ? '26px' : '3px',
            transition: 'left 0.2s ease',
          }} />
        </button>
        <span style={{ fontSize: '0.95rem', fontWeight: billingCycle === 'yearly' ? 700 : 400, color: billingCycle === 'yearly' ? 'var(--text)' : 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Annual Billing
          <span style={{
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'rgba(255, 90, 40, 0.18)',
            color: 'var(--accent)',
            fontWeight: 700,
            border: '1px solid rgba(255, 90, 40, 0.3)',
          }}>
            Save 20%
          </span>
        </span>
      </div>

      {/* ── Tier Cards Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem',
        marginTop: '0.5rem',
      }}>
        {plans.map((plan) => {
          const price = billingCycle === 'yearly' ? plan.yearly_price_inr : plan.monthly_price_inr
          const isCurrentPlan = status?.plan_id === plan.id && status.status === 'active'
          return (
            <div
              key={plan.id}
              style={{
                background: plan.popular
                  ? 'linear-gradient(165deg, rgba(255, 90, 40, 0.08) 0%, var(--card-bg) 100%)'
                  : 'var(--card-bg)',
                border: plan.popular ? '1.5px solid var(--accent)' : '1px solid var(--line)',
                borderRadius: '16px',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: plan.popular ? '0 14px 40px rgba(255, 90, 40, 0.12)' : 'var(--shadow-card)',
                position: 'relative',
              }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '24px',
                  background: 'var(--accent)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  padding: '3px 12px',
                  borderRadius: '10px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  Most Popular
                </div>
              )}

              <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.25rem', color: 'var(--text)' }}>
                {plan.name}
              </h3>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.84rem', color: 'var(--text-subtle)', minHeight: '38px' }}>
                {plan.description}
              </p>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '1.2rem', color: 'var(--text-subtle)' }}>₹</span>
                  <span style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                    {price.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-subtle)' }}>
                    {billingCycle === 'yearly' ? '/ year' : '/ month'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--accent)', marginTop: '0.2rem', fontWeight: 600 }}>
                  Up to {plan.profile_limit.toLocaleString()} active student profiles
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginBottom: '1.5rem', flex: '1' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.8rem' }}>
                  What's included:
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {plan.features.map((f, i) => (
                    <li key={i} style={{ lineHeight: 1.35 }}>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="button"
                  disabled={isProcessing || isCurrentPlan}
                  onClick={() => handleSubscribe(plan.id)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    background: isCurrentPlan ? 'var(--steel-3)' : plan.popular ? 'var(--accent)' : 'var(--surface-subtle)',
                    color: isCurrentPlan ? 'var(--text-muted)' : plan.popular ? '#FFFFFF' : 'var(--text)',
                    border: isCurrentPlan ? 'none' : '1px solid var(--border)',
                    cursor: isProcessing || isCurrentPlan ? 'default' : 'pointer',
                    boxShadow: plan.popular && !isCurrentPlan ? '0 4px 16px rgba(255, 90, 40, 0.3)' : 'none',
                  }}
                >
                  {isCurrentPlan ? '✓ Current Active Plan' : isProcessing ? 'Connecting Razorpay...' : `Subscribe with Razorpay →`}
                </button>

                {!isCurrentPlan && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleInstantActivate(plan.id, plan.profile_limit)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.8rem',
                      borderRadius: '8px',
                      background: 'rgba(95, 163, 127, 0.12)',
                      border: '1px solid rgba(95, 163, 127, 0.35)',
                      color: '#6fc797',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                    }}
                  >
                    ⚡ 1-Click Instant Activate (Test)
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Interactive Custom Profile Slider ── */}
      <SectionCard title="Custom Cohort Volume Calculator" subtitle="Need to manage arbitrary profile counts for specialized campuses?">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-subtle)' }}>Managed Student Profiles:</span>
              <strong style={{ fontSize: '1.4rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                {customProfiles.toLocaleString()} profiles
              </strong>
            </div>
            <input
              type="range"
              min="100"
              max="15000"
              step="100"
              value={customProfiles}
              onChange={(e) => setCustomProfiles(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              <span>100 profiles</span>
              <span>5,000 profiles</span>
              <span>10,000 profiles</span>
              <span>15,000+ profiles</span>
            </div>
          </div>

          <div style={{
            background: 'var(--surface-subtle)',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estimated Razorpay Billing</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                ₹{customAmount.toLocaleString()}{' '}
                <span style={{ fontSize: '0.84rem', fontWeight: 400, color: 'var(--text-subtle)' }}>
                  {billingCycle === 'yearly' ? '/ yr' : '/ mo'}
                </span>
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--patina)', marginTop: '0.2rem' }}>
                ₹{customRate.toFixed(2)}/profile/month {billingCycle === 'yearly' && '(20% annual savings applied)'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="button"
                disabled={isProcessing}
                onClick={() => handleSubscribe('custom', customProfiles)}
                style={{ background: 'var(--accent)', color: '#FFFFFF', fontWeight: 700, borderRadius: '8px', border: 'none', padding: '0.65rem 1.4rem' }}
              >
                {isProcessing ? 'Connecting...' : 'Subscribe Custom Tier →'}
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleInstantActivate('custom', customProfiles)}
                style={{
                  background: 'rgba(95, 163, 127, 0.12)',
                  border: '1px solid rgba(95, 163, 127, 0.35)',
                  color: '#6fc797',
                  fontWeight: 700,
                  borderRadius: '8px',
                  padding: '0.65rem 1rem',
                  fontSize: '0.85rem',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                ⚡ 1-Click Instant Activate ({customProfiles.toLocaleString()} Profiles)
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Transaction & Payment History Table ── */}
      <SectionCard title="Payment Invoices & Receipts" subtitle="Immutable record of Razorpay orders, transaction receipts, and captures:">
        {transactions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-subtle)' }}>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>No payment receipts logged yet.</p>
            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.82rem' }}>Activated subscription orders will appear here.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '0.5rem', width: '100%', maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <table className="table" style={{ width: '100%', minWidth: '780px', fontSize: '0.84rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Order ID</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Payment ID</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Plan / Cycle</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Profiles Limit</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Amount (INR)</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Status</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: 'var(--text-subtle)' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                    <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mono)' }}>{tx.order_id}</td>
                    <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-subtle)' }}>{tx.payment_id}</td>
                    <td style={{ padding: '0.65rem 0.75rem', textTransform: 'capitalize' }}>{tx.plan_id} ({tx.billing_cycle})</td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>{tx.profile_limit.toLocaleString()} profiles</td>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: 'var(--text)' }}>₹{tx.amount_inr.toLocaleString()}</td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: tx.status === 'captured' ? 'rgba(95, 163, 127, 0.15)' : 'rgba(255, 90, 40, 0.15)',
                        color: tx.status === 'captured' ? '#6fc797' : '#ff7547',
                      }}>
                        {tx.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: 'var(--text-subtle)' }}>
                      {new Date(tx.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ── Interactive Razorpay Sandbox Test Checkout Modal ── */}
      <RazorpaySandboxModal
        isOpen={sandboxModal.isOpen}
        onClose={() => setSandboxModal((prev) => ({ ...prev, isOpen: false }))}
        orderId={sandboxModal.orderId}
        amountInr={sandboxModal.amountInr}
        planName={sandboxModal.planName}
        billingCycle={sandboxModal.billingCycle}
        profileLimit={sandboxModal.profileLimit}
        onPaymentSuccess={handleSandboxPaymentSuccess}
        onPaymentFailure={(errMsg) => setError(errMsg)}
      />
    </div>
  )
}

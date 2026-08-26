import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useInView, animate, useReducedMotion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { dashboardRouteForRole } from '../utils/routes'

interface CounterProps {
  from?: number
  to: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
}

const AnimatedCounter: React.FC<CounterProps> = ({
  from = 0,
  to,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 1.5,
}) => {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })
  const [displayValue, setDisplayValue] = useState(from)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (!isInView) return
    if (shouldReduceMotion) {
      setDisplayValue(to)
      return
    }

    const controls = animate(from, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        setDisplayValue(latest)
      },
    })
    return () => controls.stop()
  }, [isInView, from, to, duration, shouldReduceMotion])

  const formatted = decimals > 0 
    ? displayValue.toFixed(decimals) 
    : Math.round(displayValue).toLocaleString()

  return (
    <span ref={ref}>
      {prefix}{formatted}{suffix}
    </span>
  )
}

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
}

const heroContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.1,
    },
  },
}

const heroItemVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
}

const heroPreviewVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  },
}

export const LandingPage: React.FC = () => {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')
  const [managedStudents, setManagedStudents] = useState<number>(500)
  const [activeFaq, setActiveFaq] = useState<number | null>(0)
  const [activeBenefitTab, setActiveBenefitTab] = useState<'students' | 'faculty' | 'placement' | 'recruiters'>('students')

  const handlePortalNavigate = () => {
    if (session) {
      navigate(dashboardRouteForRole(session.role))
    } else {
      navigate('/login')
    }
  }

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index)
  }

  return (
    <div className="forgr-landing">
      {/* ── 1. NAVIGATION BAR ───────────────────────────────────────────── */}
      <header className="landing-nav-header">
        <div className="landing-nav-container">
          <Link to="/" className="landing-brand">
            <div className="landing-brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
                <path d="M12 8v8M8 12h8" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="landing-brand-text">
              <span className="brand-name">FORGR</span>
              <span className="brand-badge">AI PLATFORM</span>
            </div>
          </Link>

          <nav className={`landing-nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#benefits" onClick={() => setMobileMenuOpen(false)}>Benefits</a>
            <a href="#stats" onClick={() => setMobileMenuOpen(false)}>Achievements</a>
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)}>Testimonials</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
          </nav>

          <div className="landing-nav-actions">
            <ThemeToggle />
            {session ? (
              <button onClick={handlePortalNavigate} className="landing-btn-primary">
                <span>Go to Dashboard</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <>
                <Link to="/login" className="landing-btn-ghost">
                  Sign In
                </Link>
                <button onClick={handlePortalNavigate} className="landing-btn-primary">
                  <span>Launch Portal</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            <button
              className="landing-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. HERO SECTION ────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-container">
          <div className="hero-grid">
            <motion.div
              className="hero-content"
              initial="hidden"
              animate="visible"
              variants={heroContainerVariants}
            >
              <motion.div className="hero-pill" variants={heroItemVariants}>
                <span className="pill-pulse" />
                <span className="pill-text">FORGR Engine v2.4 Active • Real-time Risk & Placement Predictor</span>
              </motion.div>

              <motion.h1 className="hero-title" variants={heroItemVariants}>
                Predict Academic Risk. <br />
                <span className="gradient-text">Forge Placement Readiness.</span>
              </motion.h1>

              <motion.p className="hero-subtitle" variants={heroItemVariants}>
                FORGR is the multi-stakeholder AI intelligence ecosystem that unifies academic performance, 
                attendance tracking, skill benchmarking, and machine learning placement forecasts for students, 
                faculty, parents, and recruiters.
              </motion.p>

              <motion.div className="hero-ctas" variants={heroItemVariants}>
                <button onClick={handlePortalNavigate} className="landing-btn-hero-primary">
                  <span>{session ? 'Enter Your Dashboard' : 'Explore Platform Now'}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>

                <a href="#how-it-works" className="landing-btn-hero-secondary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                  </svg>
                  <span>See How ML Works</span>
                </a>
              </motion.div>

              <motion.div className="hero-trust-badges" variants={heroItemVariants}>
                <div className="trust-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Role-Based Security</span>
                </div>
                <div className="trust-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>RandomForest ML Model</span>
                </div>
                <div className="trust-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>6 Unified Portals</span>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              className="hero-preview"
              initial="hidden"
              animate="visible"
              variants={heroPreviewVariants}
            >
              <div className="preview-card-glass">
                <div className="card-top-bar">
                  <div className="dot red" />
                  <div className="dot yellow" />
                  <div className="dot green" />
                  <span className="bar-title">FORGR AI Live Intelligence Stream</span>
                </div>

                <div className="preview-metrics-grid">
                  <div className="metric-box glowing-amber">
                    <span className="box-label">Placement Readiness Score</span>
                    <div className="box-val-row">
                      <span className="box-number">
                        <AnimatedCounter to={88.4} decimals={1} suffix="%" />
                      </span>
                      <span className="badge-tag green">Tier 1 Target</span>
                    </div>
                    <div className="progress-bar-wrap">
                      <motion.div
                        className="progress-fill green"
                        initial={{ width: 0 }}
                        whileInView={{ width: '88%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>

                  <div className="metric-box glowing-blue">
                    <span className="box-label">Early Academic Risk Status</span>
                    <div className="box-val-row">
                      <span className="box-number text-teal">LOW RISK</span>
                      <span className="badge-tag blue">CGPA 8.42</span>
                    </div>
                    <div className="progress-bar-wrap">
                      <motion.div
                        className="progress-fill blue"
                        initial={{ width: 0 }}
                        whileInView={{ width: '92%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>
                </div>

                <div className="preview-live-feed">
                  <div className="feed-header">
                    <span>Active ML Interventions</span>
                    <span className="live-dot">● LIVE</span>
                  </div>
                  <div className="feed-item">
                    <div className="feed-icon green">✓</div>
                    <div className="feed-text">
                      <strong>LeetCode Mastery:</strong> 210 Problems solved (+15 this week).
                    </div>
                  </div>
                  <div className="feed-item">
                    <div className="feed-icon amber">!</div>
                    <div className="feed-text">
                      <strong>Attendance Alert:</strong> Data Structures attendance at 78% (Threshold 75%).
                    </div>
                  </div>
                  <div className="feed-item">
                    <div className="feed-icon blue">⚡</div>
                    <div className="feed-text">
                      <strong>Recruiter Match:</strong> Profile shortlisted for Campus Tech Drive 2026.
                    </div>
                  </div>
                </div>

                <div className="preview-card-footer">
                  <span>
                    ML Confidence Index: <AnimatedCounter to={96.8} decimals={1} suffix="%" />
                  </span>
                  <span className="status-online">
                    <span className="status-dot-pulse" />
                    System Ready
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 3. FEATURES SECTION ────────────────────────────────────────── */}
      <section id="features" className="landing-section">
        <div className="landing-container">
          <motion.div
            className="section-header center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
          >
            <span className="section-eyebrow">CORE PLATFORM CAPABILITIES</span>
            <h2 className="section-title">End-to-End Educational & Career Intelligence</h2>
            <p className="section-subtitle">
              FORGR connects fragmented institutional metrics into a single predictive engine designed for action.
            </p>
          </motion.div>

          <motion.div
            className="features-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
          >
            <motion.div className="feature-card" variants={fadeInUp}>
              <div className="feature-icon ember">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <h3 className="feature-title">ML Placement Readiness Engine</h3>
              <p className="feature-desc">
                Machine learning model evaluating aptitude, coding skill scores, resume benchmarks, and soft skills to project hiring probability.
              </p>
              <div className="feature-tag">RandomForest Classifier</div>
            </motion.div>

            <motion.div className="feature-card" variants={fadeInUp}>
              <div className="feature-icon amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 className="feature-title">Early Academic Risk Radar</h3>
              <p className="feature-desc">
                Automated threshold monitoring flagging attendance &lt; 75%, active backlogs, and CGPA drops before semester de-barment occurs.
              </p>
              <div className="feature-tag">Predictive Warning</div>
            </motion.div>

            <motion.div className="feature-card" variants={fadeInUp}>
              <div className="feature-icon tempered">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <h3 className="feature-title">Skill Matrix & Gap Analytics</h3>
              <p className="feature-desc">
                Real-time tracking of technical problem solving, system design capabilities, and industry-demanded technology stack mastery.
              </p>
              <div className="feature-tag">Skill Benchmarks</div>
            </motion.div>

            <motion.div className="feature-card" variants={fadeInUp}>
              <div className="feature-icon patina">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h3 className="feature-title">Real-Time Attendance Intelligence</h3>
              <p className="feature-desc">
                Subject-by-subject attendance analytics with instant notifications for students, faculty advisors, and parents.
              </p>
              <div className="feature-tag">Live Sync</div>
            </motion.div>

            <motion.div className="feature-card" variants={fadeInUp}>
              <div className="feature-icon ember">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="feature-title">6 Multi-Stakeholder Portals</h3>
              <p className="feature-desc">
                Role-tailored dashboards giving customized views for Students, Faculty, Admin, Placement Officers, Recruiters, and Parents.
              </p>
              <div className="feature-tag">Role-Based Views</div>
            </motion.div>

            <motion.div className="feature-card" variants={fadeInUp}>
              <div className="feature-icon tempered">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
              <h3 className="feature-title">Recruiter Talent Pipeline</h3>
              <p className="feature-desc">
                Direct candidate discovery for corporate campus recruiters with verified skill badges, readiness scores, and instant shortlisting.
              </p>
              <div className="feature-tag">Recruitment Acceleration</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── 4. HOW IT WORKS ────────────────────────────────────────────── */}
      <section id="how-it-works" className="landing-section dark-bg">
        <div className="landing-container">
          <motion.div
            className="section-header center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
          >
            <span className="section-eyebrow">FOUR-STEP PREDICTIVE PIPELINE</span>
            <h2 className="section-title">How FORGR Drives Student Success</h2>
            <p className="section-subtitle">
              From data aggregation to corporate placement, see how our machine learning pipeline operates.
            </p>
          </motion.div>

          <motion.div
            className="steps-wrapper"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
          >
            <motion.div className="step-card" variants={fadeInUp}>
              <div className="step-number">01</div>
              <div className="step-content">
                <h3 className="step-title">Multi-Source Data Ingestion</h3>
                <p className="step-desc">
                  FORGR continuously ingests academic CGPA records, attendance logs, coding platform stats, and soft skill assessments.
                </p>
              </div>
            </motion.div>

            <div className="step-divider">→</div>

            <motion.div className="step-card" variants={fadeInUp}>
              <div className="step-number">02</div>
              <div className="step-content">
                <h3 className="step-title">ML Model Processing</h3>
                <p className="step-desc">
                  RandomForest and Regressor algorithms evaluate 20+ features to calculate risk flags and readiness percentages.
                </p>
              </div>
            </motion.div>

            <div className="step-divider">→</div>

            <motion.div className="step-card" variants={fadeInUp}>
              <div className="step-number">03</div>
              <div className="step-content">
                <h3 className="step-title">Actionable AI Suggestions</h3>
                <p className="step-desc">
                  Students and faculty receive targeted recommendations (e.g., remedial attendance requirements, coding goals).
                </p>
              </div>
            </motion.div>

            <div className="step-divider">→</div>

            <motion.div className="step-card" variants={fadeInUp}>
              <div className="step-number">04</div>
              <div className="step-content">
                <h3 className="step-title">Campus Placement Matching</h3>
                <p className="step-desc">
                  Placement Cell and Recruiter dashboards highlight top candidates and match profiles to company criteria.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── 5. BENEFITS ────────────────────────────────────────────────── */}
      <section id="benefits" className="landing-section">
        <div className="landing-container">
          <motion.div
            className="section-header center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
          >
            <span className="section-eyebrow">TAILORED VALUE PROPOSITION</span>
            <h2 className="section-title">Built for Every Stakeholder in Education</h2>
            <p className="section-subtitle">
              Choose your role to see how FORGR delivers immediate ROI across your institution.
            </p>
          </motion.div>

          <motion.div
            className="benefits-tabs"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
          >
            <button
              className={`tab-btn ${activeBenefitTab === 'students' ? 'active' : ''}`}
              onClick={() => setActiveBenefitTab('students')}
            >
              For Students
            </button>
            <button
              className={`tab-btn ${activeBenefitTab === 'faculty' ? 'active' : ''}`}
              onClick={() => setActiveBenefitTab('faculty')}
            >
              For Faculty & Mentors
            </button>
            <button
              className={`tab-btn ${activeBenefitTab === 'placement' ? 'active' : ''}`}
              onClick={() => setActiveBenefitTab('placement')}
            >
              For Placement Cell
            </button>
            <button
              className={`tab-btn ${activeBenefitTab === 'recruiters' ? 'active' : ''}`}
              onClick={() => setActiveBenefitTab('recruiters')}
            >
              For Corporate Recruiters
            </button>
          </motion.div>

          <motion.div
            className="benefit-display-card"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
          >
            {activeBenefitTab === 'students' && (
              <div className="benefit-tab-content">
                <div className="benefit-info">
                  <span className="role-tag">STUDENT ECOSYSTEM</span>
                  <h3 className="benefit-headline">Take Ownership of Your Career Trajectory</h3>
                  <ul className="benefit-list">
                    <li>
                      <span className="check">✓</span>
                      <span>Real-time Placement Readiness score showing exact tier eligibility.</span>
                    </li>
                    <li>
                      <span className="check">✓</span>
                      <span>Automated AI recommendations on coding problems & resume building.</span>
                    </li>
                    <li>
                      <span className="check">✓</span>
                      <span>Early warnings before attendance triggers exam de-barment.</span>
                    </li>
                    <li>
                      <span className="check">✓</span>
                      <span>Direct visibility into recruiter campus shortlists.</span>
                    </li>
                  </ul>
                </div>
                <div className="benefit-stat-box">
                  <div className="stat-big">
                    <AnimatedCounter prefix="+" to={35} suffix="%" />
                  </div>
                  <div className="stat-label">Average Increase in Student Placement Readiness within 60 Days</div>
                </div>
              </div>
            )}

            {activeBenefitTab === 'faculty' && (
              <div className="benefit-tab-content">
                <div className="benefit-info">
                  <span className="role-tag">FACULTY & MENTORS</span>
                  <h3 className="benefit-headline">Proactive Academic Mentorship Made Simple</h3>
                  <ul className="benefit-list">
                    <li>
                      <span className="check">✓</span>
                      <span>Automated identification of at-risk students in your department.</span>
                    </li>
                    <li>
                      <span className="check">✓</span>
                      <span>One-click remedial session assignment and attendance logging.</span>
                    </li>
                    <li>
                      <span className="check">✓</span>
                      <span>Batch analytics on subject pass rates and skill distribution.</span>
                    </li>
                  </ul>
                </div>
                <div className="benefit-stat-box">
                  <div className="stat-big">
                    <AnimatedCounter to={70} suffix="%" />
                  </div>
                  <div className="stat-label">Reduction in Administrative Monitoring Hours for Faculty</div>
                </div>
              </div>
            )}

            {activeBenefitTab === 'placement' && (
              <div className="benefit-tab-content">
                <div className="benefit-info">
                  <span className="role-tag">PLACEMENT OFFICERS</span>
                  <h3 className="benefit-headline">Maximize On-Campus Hiring Rates & Packages</h3>
                  <ul className="benefit-list">
                    <li>
                      <span className="check">✓</span>
                      <span>Comprehensive batch readiness heatmaps across engineering branches.</span>
                    </li>
                    <li>
                      <span className="check">✓</span>
                      <span>Instant candidate filtering based on company-specific cutoffs.</span>
                    </li>
                    <li>
                      <span className="check">✓</span>
                      <span>Automated job drive management and applicant tracking.</span>
                    </li>
                  </ul>
                </div>
                <div className="benefit-stat-box">
                  <div className="stat-big">
                    <AnimatedCounter to={98.4} decimals={1} suffix="%" />
                  </div>
                  <div className="stat-label">Accuracy in Company Eligibility & Candidate Matching</div>
                </div>
              </div>
            )}

            {activeBenefitTab === 'recruiters' && (
              <div className="benefit-tab-content">
                <div className="benefit-info">
                  <span className="role-tag">RECRUITMENT TEAMS</span>
                  <h3 className="benefit-headline">Hire Top Verified Talent Faster</h3>
                  <ul className="benefit-list">
                    <li>
                      <span className="check">✓</span>
                      <span>Access pre-verified candidate profiles with objective ML scores.</span>
                    </li>
                    <li>
                      <span className="check">✓</span>
                      <span>Filter candidates by coding score, CGPA, and specific skill badges.</span>
                    </li>
                    <li>
                      <span className="check">✓</span>
                      <span>Direct campus interview scheduling and shortlist management.</span>
                    </li>
                  </ul>
                </div>
                <div className="benefit-stat-box">
                  <div className="stat-big">
                    <AnimatedCounter to={3} suffix="x" />
                  </div>
                  <div className="stat-label">Faster Time-to-Hire for Technical Campus Drives</div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── 6. STATISTICS / ACHIEVEMENTS ────────────────────────────────── */}
      <section id="stats" className="landing-section dark-bg">
        <div className="landing-container">
          <motion.div
            className="stats-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
          >
            <motion.div className="stat-card glowing-border" variants={fadeInUp}>
              <div className="stat-number">
                <AnimatedCounter to={98.4} decimals={1} suffix="%" />
              </div>
              <div className="stat-title">ML Prediction Accuracy</div>
              <div className="stat-sub">High precision model trained on 50,000+ academic & placement records.</div>
            </motion.div>

            <motion.div className="stat-card glowing-border" variants={fadeInUp}>
              <div className="stat-number">
                <AnimatedCounter to={45} suffix="%" />
              </div>
              <div className="stat-title">Placement Rate Boost</div>
              <div className="stat-sub">Average increase in tier-1 tech placements across partner campuses.</div>
            </motion.div>

            <motion.div className="stat-card glowing-border" variants={fadeInUp}>
              <div className="stat-number">
                <AnimatedCounter to={10000} suffix="+" />
              </div>
              <div className="stat-title">Active Student Profiles</div>
              <div className="stat-sub">Tracked in real time for academic risk & skill benchmarks.</div>
            </motion.div>

            <motion.div className="stat-card glowing-border" variants={fadeInUp}>
              <div className="stat-number">&lt; 24 hrs</div>
              <div className="stat-title">Risk Detection Window</div>
              <div className="stat-sub">Early warning alert generation prior to examination cutoffs.</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── 7. TESTIMONIALS ─────────────────────────────────────────────── */}
      <section id="testimonials" className="landing-section">
        <div className="landing-container">
          <motion.div
            className="section-header center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
          >
            <span className="section-eyebrow">TRUSTED BY INSTITUTIONS & RECRUITERS</span>
            <h2 className="section-title">What Leaders Say About FORGR</h2>
            <p className="section-subtitle">
              Discover how universities and hiring partners transform outcomes using FORGR.
            </p>
          </motion.div>

          <motion.div
            className="testimonials-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
          >
            <motion.div className="testimonial-card" variants={fadeInUp}>
              <div className="stars">★★★★★</div>
              <p className="quote">
                "FORGR completely eliminated our manual placement eligibility tracking. The machine learning readiness score predicted our top candidates with uncanny precision."
              </p>
              <div className="author-row">
                <div className="author-avatar ember">DR</div>
                <div className="author-meta">
                  <div className="author-name">Dr. R. K. Sharma</div>
                  <div className="author-role">Dean of Placements & Training, SIT</div>
                </div>
              </div>
            </motion.div>

            <motion.div className="testimonial-card" variants={fadeInUp}>
              <div className="stars">★★★★★</div>
              <p className="quote">
                "As a student, having clear AI suggestions on what to improve—whether LeetCode problems or aptitude tests—helped me secure my dream package at a Tier-1 Tech firm."
              </p>
              <div className="author-row">
                <div className="author-avatar blue">AV</div>
                <div className="author-meta">
                  <div className="author-name">Ananya Verma</div>
                  <div className="author-role">Final Year CS Student (Placed @ $28k)</div>
                </div>
              </div>
            </motion.div>

            <motion.div className="testimonial-card" variants={fadeInUp}>
              <div className="stars">★★★★★</div>
              <p className="quote">
                "The Early Academic Risk Radar allowed our department to intervene 2 months before exams. Attendance de-barments dropped by 80% this semester."
              </p>
              <div className="author-row">
                <div className="author-avatar green">MN</div>
                <div className="author-meta">
                  <div className="author-name">Prof. Meera Nair</div>
                  <div className="author-role">Head of Computer Engineering</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── 8. PRICING ──────────────────────────────────────────────────── */}
      <section id="pricing" className="landing-section dark-bg">
        <div className="landing-container">
          <motion.div
            className="section-header center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
          >
            <span className="section-eyebrow">PAY-PER-STUDENT BILLING</span>
            <h2 className="section-title">Pay Only For Active Student Profiles You Manage</h2>
            <p className="section-subtitle">
              Transparent per-student pricing tailored to your institution. Scale seamlessly from 50 to 50,000+ student profiles.
            </p>

            <div className="pricing-toggle-wrap">
              <span className={billingCycle === 'monthly' ? 'active' : ''}>Monthly Billing</span>
              <button
                className={`toggle-switch ${billingCycle === 'annual' ? 'on' : ''}`}
                onClick={() => setBillingCycle(billingCycle === 'annual' ? 'monthly' : 'annual')}
                aria-label="Toggle billing cycle"
              >
                <span className="switch-handle" />
              </button>
              <span className={billingCycle === 'annual' ? 'active' : ''}>
                Annual Billing <span className="discount-badge">Save 20%</span>
              </span>
            </div>
          </motion.div>

          {/* Interactive Managed Student Profile Pricing Calculator */}
          <motion.div
            className="pricing-calculator-card glowing-border"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
          >
            <div className="pricing-calc-header">
              <h3 className="pricing-calc-title">
                Calculate Your Custom Campus Cost
              </h3>
              <p className="pricing-calc-desc">
                Drag the slider or enter the total number of student profiles managed in this project:
              </p>
            </div>

            <div className="pricing-calc-inner">
              <div className="pricing-calc-top-row">
                <div>
                  <span className="pricing-calc-lbl">
                    Managed Student Profiles
                  </span>
                  <div className="pricing-calc-val">
                    <span>{managedStudents.toLocaleString()}</span>
                    <span className="pricing-calc-unit">profiles</span>
                  </div>
                </div>

                <div className="pricing-calc-input-wrap">
                  <label htmlFor="student-input">Type Count:</label>
                  <input
                    id="student-input"
                    type="number"
                    min="10"
                    max="50000"
                    step="10"
                    value={managedStudents}
                    onChange={(e) => setManagedStudents(Math.max(1, Number(e.target.value) || 0))}
                    className="pricing-input"
                  />
                </div>
              </div>

              {/* Slider Control */}
              <input
                type="range"
                min="50"
                max="10000"
                step="50"
                value={managedStudents}
                onChange={(e) => setManagedStudents(Number(e.target.value))}
                className="pricing-range-slider"
              />

              <div className="pricing-slider-markers">
                <span>50 profiles</span>
                <span>2,500 profiles</span>
                <span>5,000 profiles</span>
                <span>10,000+ profiles</span>
              </div>
            </div>

            {/* Calculated Breakdown */}
            {(() => {
              const baseRate = managedStudents <= 500 ? 1.50 : managedStudents <= 2500 ? 1.20 : 0.90
              const effectiveRate = billingCycle === 'annual' ? baseRate * 0.8 : baseRate
              const totalMonthly = Math.round(managedStudents * effectiveRate)
              return (
                <div className="pricing-breakdown-grid">
                  <div className="pricing-stat-subbox">
                    <div className="pricing-breakdown-lbl">Effective Rate Per Managed Profile</div>
                    <div className="pricing-breakdown-val">
                      ${effectiveRate.toFixed(2)} <span className="pricing-breakdown-sub">/ profile / mo</span>
                    </div>
                    <div className="pricing-breakdown-tag">
                      {managedStudents <= 500 ? 'Starter tier' : managedStudents <= 2500 ? 'Growth volume discount' : 'Enterprise maximum discount'}
                    </div>
                  </div>

                  <div className="pricing-stat-accentbox">
                    <div className="pricing-breakdown-lbl">Estimated Total Billing</div>
                    <div className="pricing-breakdown-bigval">
                      ${totalMonthly.toLocaleString()} <span className="pricing-breakdown-sub">/ month</span>
                    </div>
                    <div className="pricing-breakdown-note">
                      {billingCycle === 'annual' ? `Billed annually ($${(totalMonthly * 12).toLocaleString()}/yr — 20% saved)` : 'Billed monthly per active profile'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <button
                      onClick={handlePortalNavigate}
                      className="landing-btn-hero-primary"
                      style={{ width: '100%', justifyContent: 'center', padding: '1rem 1.5rem' }}
                    >
                      <span>Start Managed Plan</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div className="pricing-btn-subnote">
                      Includes all 6 portals, ML risk model & PDF reports
                    </div>
                  </div>
                </div>
              )
            })()}
          </motion.div>
        </div>
      </section>

      {/* ── 9. FAQ ──────────────────────────────────────────────────────── */}
      <section id="faq" className="landing-section">
        <div className="landing-container">
          <motion.div
            className="section-header center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
          >
            <span className="section-eyebrow">FREQUENTLY ASKED QUESTIONS</span>
            <h2 className="section-title">Everything You Need to Know</h2>
            <p className="section-subtitle">
              Got questions about FORGR's AI engine or deployment? We've got answers.
            </p>
          </motion.div>

          <motion.div
            className="faq-accordion"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
          >
            {[
              {
                q: "How does FORGR calculate Placement Readiness Score?",
                a: "FORGR uses a trained RandomForest Regression and Classification pipeline that combines weighted inputs including semester CGPA, LeetCode/coding problem solving scores, aptitude test performance, resume verification ratings, and soft skill evaluations."
              },
              {
                q: "Can FORGR integrate with our existing University ERP or Attendance System?",
                a: "Yes. FORGR provides RESTful API endpoints and CSV batch import scripts to seamlessly synchronize attendance records, exam grades, and student rosters with existing institutional ERP systems."
              },
              {
                q: "What triggers an Early Academic Risk alert?",
                a: "Risk alerts trigger automatically when a student's attendance drops below 75%, active backlogs exceed 0, or semester CGPA falls below 6.5. Automated notifications are dispatched to students, faculty advisors, and linked parent accounts."
              },
              {
                q: "How are security and role permissions managed?",
                a: "FORGR enforces granular Role-Based Access Control (RBAC) across 6 distinct user roles (Student, Faculty, Admin, Placement Cell, Recruiter, and Parent). Data is encrypted in transit and at rest."
              },
              {
                q: "How fast can an institution deploy FORGR?",
                a: "Initial setup takes less than 24 hours. Once student and course databases are imported, the ML model generates readiness baselines immediately."
              }
            ].map((faq, idx) => (
              <motion.div key={idx} className={`faq-item ${activeFaq === idx ? 'open' : ''}`} variants={fadeInUp}>
                <button className="faq-question" onClick={() => toggleFaq(idx)}>
                  <span>{faq.q}</span>
                  <span className="faq-icon" style={{ transform: activeFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    {activeFaq === idx ? '−' : '+'}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {activeFaq === idx && (
                    <motion.div
                      key="content"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="faq-answer"
                    >
                      <p>{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 10. CALL-TO-ACTION ─────────────────────────────────────────── */}
      <section className="landing-cta-section">
        <div className="landing-container">
          <motion.div
            className="cta-box glowing-border"
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="cta-content">
              <h2 className="cta-title">
                Ready to Forge Higher Placement Rates & Zero Academic Risk?
              </h2>
              <p className="cta-desc">
                Join forward-thinking universities and engineering institutions using FORGR to empower students and streamline campus recruitment.
              </p>
              <div className="cta-actions">
                <button onClick={handlePortalNavigate} className="landing-btn-hero-primary">
                  <span>Get Started Instantly</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
                <Link to="/login" className="landing-btn-hero-secondary">
                  <span>Sign In to Existing Account</span>
                </Link>
              </div>
              <div className="cta-note">No credit card required for demo access • Instant setup</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 11. FOOTER ─────────────────────────────────────────────────── */}
      <motion.footer
        className="landing-footer"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="landing-container">
          <div className="footer-grid">
            <div className="footer-brand-col">
              <div className="landing-brand">
                <div className="landing-brand-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
                    <path d="M12 8v8M8 12h8" strokeWidth="1.5" />
                  </svg>
                </div>
                <span className="brand-name">FORGR</span>
              </div>
              <p className="footer-tagline">
                Next-Generation AI Educational Growth & Campus Placement Readiness Platform.
              </p>
              <div className="system-status">
                <span className="status-dot green" />
                <span>All FORGR Core & ML Services Operational</span>
              </div>
            </div>

            <div className="footer-links-col">
              <h4 className="footer-heading">Platform</h4>
              <a href="#features">ML Predictor</a>
              <a href="#features">Risk Radar</a>
              <a href="#features">Skill Matrix</a>
              <a href="#how-it-works">How It Works</a>
            </div>

            <div className="footer-links-col">
              <h4 className="footer-heading">Portals</h4>
              <Link to="/login">Student Dashboard</Link>
              <Link to="/login">Faculty Portal</Link>
              <Link to="/login">Placement Cell</Link>
              <Link to="/login">Recruiter Pipeline</Link>
              <Link to="/login">Parent Portal</Link>
              <Link to="/login">Admin Dashboard</Link>
            </div>

            <div className="footer-links-col">
              <h4 className="footer-heading">Resources & Legal</h4>
              <a href="#faq">Documentation</a>
              <a href="#faq">API Reference</a>
              <a href="#faq">Privacy Policy</a>
              <a href="#faq">Terms of Service</a>
            </div>
          </div>

          <div className="footer-bottom">
            <div className="copyright">
              © {new Date().getFullYear()} FORGR Platform Inc. All rights reserved. Powered by Advanced ML & Educational Intelligence.
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  )
}

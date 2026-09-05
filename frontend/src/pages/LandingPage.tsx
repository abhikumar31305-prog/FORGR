import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useInView, animate, useReducedMotion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/useAuth'
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

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    setMobileMenuOpen(false)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
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
              <span className="brand-badge">STUDENT PLATFORM</span>
            </div>
          </Link>

          <nav className={`landing-nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')}>Features</a>
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')}>How It Works</a>
            <a href="#benefits" onClick={(e) => scrollToSection(e, 'benefits')}>Benefits</a>
            <a href="#stats" onClick={(e) => scrollToSection(e, 'stats')}>Achievements</a>
            <a href="#testimonials" onClick={(e) => scrollToSection(e, 'testimonials')}>Testimonials</a>
            <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')}>Pricing</a>
            <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')}>FAQ</a>
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
                <span className="pill-text">Student Profiling & Placement Readiness Platform</span>
              </motion.div>

              <motion.h1 className="hero-title" variants={heroItemVariants}>
                Track Your Academic Progress. <br />
                <span className="gradient-text">Build Your Placement Readiness.</span>
              </motion.h1>

              <motion.p className="hero-subtitle" variants={heroItemVariants}>
                FORGR brings academics, attendance, skills, projects, and placement readiness into one student profile so you can understand where you stand and what to improve next.
              </motion.p>

              <motion.div className="hero-ctas" variants={heroItemVariants}>
                <button onClick={handlePortalNavigate} className="landing-btn-hero-primary">
                  <span>{session ? 'Go to Dashboard' : 'Explore Platform Now'}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>

                <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="landing-btn-hero-secondary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                  </svg>
                  <span>See How It Works</span>
                </a>
              </motion.div>

              <motion.div className="hero-trust-badges" variants={heroItemVariants}>
                <div className="trust-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Role-Based Access</span>
                </div>
                <div className="trust-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>Placement Analytics</span>
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
                  <span className="bar-title">Student Profile Overview</span>
                </div>

                <div className="preview-metrics-grid">
                  <div className="metric-box glowing-amber">
                    <span className="box-label">Placement Readiness</span>
                    <div className="box-val-row">
                      <span className="box-number">
                        <AnimatedCounter to={88} suffix="%" />
                      </span>
                      <span className="badge-tag green">Placement Ready</span>
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
                    <span className="box-label">Academic Status</span>
                    <div className="box-val-row">
                      <span className="box-number text-teal">On Track</span>
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
                    <span>Recent Updates</span>
                    <span style={{ fontSize: '11px', color: 'var(--grey)', fontWeight: 500 }}>Demo Profile</span>
                  </div>
                  <div className="feed-item">
                    <div className="feed-icon green">✓</div>
                    <div className="feed-text">
                      Completed 12 coding problems this week.
                    </div>
                  </div>
                  <div className="feed-item">
                    <div className="feed-icon green">✓</div>
                    <div className="feed-text">
                      Attendance is currently above the required threshold (78%).
                    </div>
                  </div>
                  <div className="feed-item">
                    <div className="feed-icon blue">✓</div>
                    <div className="feed-text">
                      Added a new project to your portfolio.
                    </div>
                  </div>
                </div>

                <div className="preview-card-footer">
                  <span>
                    Semester 6 • Computer Science
                  </span>
                  <span className="status-online">
                    <span className="status-dot-pulse" />
                    Active Enrollment
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
            <h2 className="section-title">Everything You Need for Academic & Career Growth</h2>
            <p className="section-subtitle">
              FORGR brings together academic performance, attendance, technical skills, and placement tracking into a single unified platform.
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
              <h3 className="feature-title">Placement Readiness</h3>
              <p className="feature-desc">
                Understand your current placement readiness using your academic records, coding skills, and project portfolio.
              </p>
              <div className="feature-tag">Career Preparation</div>
            </motion.div>

            <motion.div className="feature-card" variants={fadeInUp}>
              <div className="feature-icon amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 className="feature-title">Academic Performance Tracking</h3>
              <p className="feature-desc">
                View your semester grades, monitor backlogs, and receive timely alerts if your performance drops.
              </p>
              <div className="feature-tag">Academic Records</div>
            </motion.div>

            <motion.div className="feature-card" variants={fadeInUp}>
              <div className="feature-icon tempered">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <h3 className="feature-title">Skill & Coding Assessment</h3>
              <p className="feature-desc">
                Track your programming proficiency and problem solving scores, and compare them with target role requirements.
              </p>
              <div className="feature-tag">Skill Matrix</div>
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
              <h3 className="feature-title">Attendance Monitoring</h3>
              <p className="feature-desc">
                Keep track of course attendance and stay aware of upcoming shortages before examination eligibility is impacted.
              </p>
              <div className="feature-tag">Course Attendance</div>
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
              <h3 className="feature-title">Role-Based Portals</h3>
              <p className="feature-desc">
                Dedicated, secure views for Students, Faculty Advisors, Placement Officers, Recruiters, and Administrators.
              </p>
              <div className="feature-tag">Institutional Access</div>
            </motion.div>

            <motion.div className="feature-card" variants={fadeInUp}>
              <div className="feature-icon tempered">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
              <h3 className="feature-title">Campus Recruitment Discovery</h3>
              <p className="feature-desc">
                Help placement coordinators and recruiters identify qualified candidates based on verified skills and performance.
              </p>
              <div className="feature-tag">Talent Discovery</div>
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
            <span className="section-eyebrow">HOW IT WORKS</span>
            <h2 className="section-title">A Simple, Structured Path from Enrollment to Placement</h2>
            <p className="section-subtitle">
              How FORGR connects student effort with measurable academic and career progress.
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
                <h3 className="step-title">Build Your Profile</h3>
                <p className="step-desc">
                  Enter or import your academic grades, semester attendance, technical skills, and project portfolio into one place.
                </p>
              </div>
            </motion.div>

            <div className="step-divider">→</div>

            <motion.div className="step-card" variants={fadeInUp}>
              <div className="step-number">02</div>
              <div className="step-content">
                <h3 className="step-title">Evaluate Where You Stand</h3>
                <p className="step-desc">
                  The platform evaluates your progress against academic benchmarks and placement prerequisites across disciplines.
                </p>
              </div>
            </motion.div>

            <div className="step-divider">→</div>

            <motion.div className="step-card" variants={fadeInUp}>
              <div className="step-number">03</div>
              <div className="step-content">
                <h3 className="step-title">Follow Targeted Recommendations</h3>
                <p className="step-desc">
                  Receive practical next steps to address attendance gaps, practice key coding topics, or enhance your portfolio.
                </p>
              </div>
            </motion.div>

            <div className="step-divider">→</div>

            <motion.div className="step-card" variants={fadeInUp}>
              <div className="step-number">04</div>
              <div className="step-content">
                <h3 className="step-title">Prepare for Placement Drives</h3>
                <p className="step-desc">
                  Showcase a verified profile to college placement coordinators and campus recruitment teams.
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
            <span className="section-eyebrow">TAILORED VALUE</span>
            <h2 className="section-title">Built for Every Stakeholder in Education</h2>
            <p className="section-subtitle">
              Explore how FORGR helps students, faculty, placement teams, and recruiters stay aligned on student progress.
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
                  <span className="role-tag">STUDENT PORTAL</span>
                  <h3 className="benefit-headline">Take Control of Your Academic & Career Growth</h3>
                  <ul className="benefit-list">
                    <li>
                      <span className="check">✓</span>
                      <span>Real-time placement readiness score showing your current standing.</span>
                    </li>
                    <li>
                      <span className="check">✓</span>
                      <span>Clear recommendations on coding practice, skills, and portfolio work.</span>
                    </li>
                    <li>
                      <span className="check">✓</span>
                      <span>Early warnings before low attendance affects exam eligibility.</span>
                    </li>
                    <li>
                      <span className="check">✓</span>
                      <span>Centralized student profile accessible for campus recruitment drives.</span>
                    </li>
                  </ul>
                </div>
                <div className="benefit-stat-box">
                  <div className="stat-big">
                    <AnimatedCounter prefix="+" to={35} suffix="%" />
                  </div>
                  <div className="stat-label">Average improvement in placement readiness after structured skill tracking</div>
                </div>
              </div>
            )}

            {activeBenefitTab === 'faculty' && (
              <div className="benefit-tab-content">
                <div className="benefit-info">
                  <span className="role-tag">FACULTY & MENTORS</span>
                  <h3 className="benefit-headline">Support Students With Clear Academic Insights</h3>
                  <ul className="benefit-list">
                    <li>
                      <span className="check">✓</span>
                      <span>Identify at-risk students who need attendance or academic intervention.</span>
                    </li>
                    <li>
                      <span className="check">✓</span>
                      <span>Assign and record remedial sessions with transparent progress logging.</span>
                    </li>
                    <li>
                      <span className="check">✓</span>
                      <span>View department-wide performance distributions across subjects and semesters.</span>
                    </li>
                  </ul>
                </div>
                <div className="benefit-stat-box">
                  <div className="stat-big">
                    <AnimatedCounter to={70} suffix="%" />
                  </div>
                  <div className="stat-label">Less time spent compiling manual attendance and marks spreadsheets</div>
                </div>
              </div>
            )}

            {activeBenefitTab === 'placement' && (
              <div className="benefit-tab-content">
                <div className="benefit-info">
                  <span className="role-tag">PLACEMENT OFFICERS</span>
                  <h3 className="benefit-headline">Organize and Accelerate Campus Placement Drives</h3>
                  <ul className="benefit-list">
                    <li>
                      <span className="check">✓</span>
                      <span>Batch-wide readiness overviews across engineering branches.</span>
                    </li>
                    <li>
                      <span className="check">✓</span>
                      <span>Filter eligible students instantly based on company cutoffs and skills.</span>
                    </li>
                    <li>
                      <span className="check">✓</span>
                      <span>Track ongoing recruitment drives and applicant status in one dashboard.</span>
                    </li>
                  </ul>
                </div>
                <div className="benefit-stat-box">
                  <div className="stat-big">
                    <AnimatedCounter to={95} suffix="%" />
                  </div>
                  <div className="stat-label">Faster candidate shortlisting based on verified eligibility criteria</div>
                </div>
              </div>
            )}

            {activeBenefitTab === 'recruiters' && (
              <div className="benefit-tab-content">
                <div className="benefit-info">
                  <span className="role-tag">RECRUITMENT TEAMS</span>
                  <h3 className="benefit-headline">Find Verified Candidates Matching Your Requirements</h3>
                  <ul className="benefit-list">
                    <li>
                      <span className="check">✓</span>
                      <span>Review student profiles with transparent academic and coding histories.</span>
                    </li>
                    <li>
                      <span className="check">✓</span>
                      <span>Filter candidates by coding score, CGPA, and specific technologies.</span>
                    </li>
                    <li>
                      <span className="check">✓</span>
                      <span>Faster campus drive shortlisting with consistent, structured student data.</span>
                    </li>
                  </ul>
                </div>
                <div className="benefit-stat-box">
                  <div className="stat-big">
                    <AnimatedCounter to={3} suffix="x" />
                  </div>
                  <div className="stat-label">Faster time-to-shortlist during on-campus hiring drives</div>
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
                <AnimatedCounter to={5000} suffix="+" />
              </div>
              <div className="stat-title">Benchmark Students Supported</div>
              <div className="stat-sub">Comprehensive multi-domain dataset indexing academics, attendance, and skills.</div>
            </motion.div>

            <motion.div className="stat-card glowing-border" variants={fadeInUp}>
              <div className="stat-number">
                <AnimatedCounter to={6} suffix="" />
              </div>
              <div className="stat-title">Role-Based Portals</div>
              <div className="stat-sub">Unified access for students, faculty, admin, placement cell, recruiters, and parents.</div>
            </motion.div>

            <motion.div className="stat-card glowing-border" variants={fadeInUp}>
              <div className="stat-number">
                <AnimatedCounter to={52} suffix="+" />
              </div>
              <div className="stat-title">Parameters Evaluated</div>
              <div className="stat-sub">Holistic profiling across coursework, coding problem solving, and project portfolios.</div>
            </motion.div>

            <motion.div className="stat-card glowing-border" variants={fadeInUp}>
              <div className="stat-number">&lt; 24 hrs</div>
              <div className="stat-title">Early Alert Generation</div>
              <div className="stat-sub">Timely warnings before attendance shortages or backlog thresholds are breached.</div>
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
            <span className="section-eyebrow">CAMPUS PERSPECTIVES</span>
            <h2 className="section-title">Feedback from Campus Users</h2>
            <p className="section-subtitle">
              How students, faculty, and placement coordinators use FORGR in everyday campus workflows.
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
                "FORGR streamlined our campus placement workflows. Being able to filter students by verified coding scores, CGPA, and project history in seconds saved our team weeks of manual spreadsheet work."
              </p>
              <div className="author-row">
                <div className="author-avatar ember">DR</div>
                <div className="author-meta">
                  <div className="author-name">Dr. R. K. Sharma</div>
                  <div className="author-role">Dean of Placements & Training</div>
                </div>
              </div>
            </motion.div>

            <motion.div className="testimonial-card" variants={fadeInUp}>
              <div className="stars">★★★★★</div>
              <p className="quote">
                "Having all my attendance, grades, and coding milestones in one dashboard made it clear what to focus on each semester. The placement readiness score gave me a concrete target to work toward."
              </p>
              <div className="author-row">
                <div className="author-avatar blue">AV</div>
                <div className="author-meta">
                  <div className="author-name">Ananya Verma</div>
                  <div className="author-role">Final Year CS Student</div>
                </div>
              </div>
            </motion.div>

            <motion.div className="testimonial-card" variants={fadeInUp}>
              <div className="stars">★★★★★</div>
              <p className="quote">
                "The attendance and backlog alerts gave our faculty advisors early visibility into struggling students before exam schedules. It made student mentorship much more proactive and effective."
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
            <span className="section-eyebrow">CAMPUS LICENSING</span>
            <h2 className="section-title">Simple, Transparent Per-Student Pricing</h2>
            <p className="section-subtitle">
              Predictable pricing based on the active student profiles your institution manages. Scale from departmental pilots to university-wide adoption.
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
                Estimate Your Institution's Plan
              </h3>
              <p className="pricing-calc-desc">
                Adjust the slider or enter the total number of student profiles managed in your institution:
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
                      {managedStudents <= 500 ? 'Departmental pilot' : managedStudents <= 2500 ? 'Campus volume discount' : 'University enterprise tier'}
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
                      <span>Explore Institutional Access</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div className="pricing-btn-subnote">
                      Includes all 6 role portals, attendance tracking, skill assessments, and placement reports
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
              Common questions about FORGR features, institutional data, and student privacy.
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
                q: "How is Placement Readiness calculated?",
                a: "FORGR evaluates a combination of academic CGPA, coding assessment proficiency, project portfolio quality, aptitude practice, and communication readiness against standard campus hiring criteria."
              },
              {
                q: "Can FORGR work with our university's existing attendance and exam data?",
                a: "Yes. FORGR provides bulk CSV import tools and REST API endpoints to easily ingest attendance sheets, semester marks, and student rosters from existing institutional campus systems."
              },
              {
                q: "How do early academic alerts work?",
                a: "When a student's attendance falls below the institutional threshold (such as 75%) or backlogs are detected, FORGR flags the student on faculty and student dashboards so early remedial action can be taken."
              },
              {
                q: "Who can access student records?",
                a: "FORGR uses role-based access control. Students only view their own profile, faculty view their assigned classes, and administrators manage institutional records securely."
              },
              {
                q: "How can students update their profile and skills?",
                a: "Students can log in to update their project highlights, portfolio links, coding practice progress, and view verified academic metrics provided by the institution."
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
                Start Managing Student Success & Placement Readiness
              </h2>
              <p className="cta-desc">
                Empower students to understand where they stand, identify skill gaps early, and give faculty the tools to intervene effectively.
              </p>
              <div className="cta-actions">
                <button onClick={handlePortalNavigate} className="landing-btn-hero-primary">
                  <span>{session ? 'Go to Dashboard' : 'Explore Platform Now'}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
                <Link to="/login" className="landing-btn-hero-secondary">
                  <span>Sign In to Existing Account</span>
                </Link>
              </div>
              <div className="cta-note">Instant role-based demonstration access • No credit card required</div>
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
                Student profiling, academic monitoring, and placement readiness platform.
              </p>
              <div className="system-status">
                <span className="status-dot green" />
                <span>All Core Services Operational</span>
              </div>
            </div>

            <div className="footer-links-col">
              <h4 className="footer-heading">Platform</h4>
              <a href="#features" onClick={(e) => scrollToSection(e, 'features')}>Placement Readiness</a>
              <a href="#features" onClick={(e) => scrollToSection(e, 'features')}>Academic Tracking</a>
              <a href="#features" onClick={(e) => scrollToSection(e, 'features')}>Skill Matrix</a>
              <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')}>How It Works</a>
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
              <h4 className="footer-heading">Overview</h4>
              <a href="#benefits" onClick={(e) => scrollToSection(e, 'benefits')}>Benefits</a>
              <a href="#stats" onClick={(e) => scrollToSection(e, 'stats')}>Achievements</a>
              <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')}>Pricing</a>
              <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')}>FAQ</a>
            </div>
          </div>

          <div className="footer-bottom">
            <div className="copyright">
              © {new Date().getFullYear()} FORGR Platform. All rights reserved. Student profiling & placement intelligence.
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  )
}

export default LandingPage

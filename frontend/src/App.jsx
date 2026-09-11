import { useEffect, useMemo, useState } from 'react'
import * as api from './api/client'
import './App.css'

const documents = {
  GST: 'GST Certificate',
  PAN: 'PAN Card',
  ITR: 'ITR acknowledgement',
  OEM_AUTHORIZATION: 'OEM authorisation',
  LOCAL_CONTENT: 'Local-content declaration',
  EXPERIENCE: 'Experience certificate',
  UDYAM: 'Udyam registration'
}

const cx = value => `status-badge ${String(value || 'PENDING').toLowerCase().replaceAll(' ', '-')}`
const icon = { dashboard: '⌂', bidders: '◫', intelligence: '◈', decisions: '✓', reports: '▤' }

export default function App() {
  const [signedIn, setSignedIn] = useState(false)
  const [page, setPage] = useState('dashboard')
  const [tenders, setTenders] = useState([])
  const [tender, setTender] = useState(null)
  const [requirements, setRequirements] = useState([])
  const [bidders, setBidders] = useState([])
  const [intelligence, setIntelligence] = useState(null)
  const [bidder, setBidder] = useState(null)
  const [report, setReport] = useState(null)
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [uploadType, setUploadType] = useState('GST')
  const [uploadFile, setUploadFile] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [showTenderForm, setShowTenderForm] = useState(false)
  const [showBidderForm, setShowBidderForm] = useState(false)

  const notify = (text, kind = 'info') => setMessage({ text, kind })
  const navigate = id => {
    setPage(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const loadTender = async selected => {
    setBusy(true)
    try {
      const [reqs, summaries, insights] = await Promise.all([
        api.getRequirements(selected.id),
        api.getBidderSummaries(selected.id),
        api.getTenderIntelligence(selected.id)
      ])
      setTender(selected)
      setRequirements(reqs)
      setBidders(summaries)
      setIntelligence(insights)
      setBidder(null)
      setReport(null)
      setPage('dashboard')
    } catch (e) {
      notify(e.response?.data?.message || 'Could not load tender data. Confirm the backend and database are running.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const loadBidder = async selected => {
    setBusy(true)
    try {
      const [nextReport, nextFiles] = await Promise.all([
        api.getCompliance(selected.id),
        api.getDocuments(selected.id)
      ])
      setBidder(selected)
      setReport(nextReport)
      setFiles(nextFiles)
      setRemarks(nextReport.officerDecision?.remarks || '')
      setPage('casefile')
      requestAnimationFrame(() => document.getElementById('casefile')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } catch (e) {
      notify(e.response?.data?.message || 'Could not load the compliance report.', 'error')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!signedIn) return
    setBusy(true)
    api.getTenders()
      .then(data => {
        setTenders(data)
        if (data[0]) return loadTender(data[0])
      })
      .catch(() => notify('Backend is offline or demo data has not been seeded.', 'error'))
      .finally(() => setBusy(false))
  }, [signedIn])

  const refreshBidder = async () => {
    if (!bidder) return
    const selected = bidder
    await loadTender(tender)
    await loadBidder(selected)
  }

  const upload = async e => {
    e.preventDefault()
    if (!uploadFile) return notify('Select a PDF document first.', 'error')
    setBusy(true)
    try {
      await api.uploadDocument(bidder.id, uploadType, uploadFile)
      setUploadFile(null)
      notify('Document uploaded. Select Verify to run the evidence check.', 'success')
      await refreshBidder()
    } catch (e) {
      notify(e.response?.data?.message || 'Upload failed. Use a PDF under 10 MB.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const verify = async file => {
    setBusy(true)
    try {
      await api.verifyDocument(file.id, file.document_type)
      notify('Verification completed and the compliance score was recalculated.', 'success')
      await refreshBidder()
    } catch (e) {
      notify(e.response?.data?.message || 'Verification failed. Check that the AI service is running.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const blacklist = async () => {
    setBusy(true)
    try {
      await api.verifyBlacklist(bidder.id)
      notify('Blacklist registry check completed.', 'success')
      await refreshBidder()
    } catch (e) {
      notify(e.response?.data?.message || 'Blacklist check failed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const decide = async decision => {
    setBusy(true)
    try {
      await api.saveOfficerDecision(bidder.id, decision, remarks)
      notify(`Officer decision “${decision}” saved.`, 'success')
      await refreshBidder()
    } catch (e) {
      notify(e.response?.data?.message || 'Could not save the officer decision.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const createTender = async values => {
    setBusy(true)
    try {
      const created = await api.uploadTender(values)
      const all = await api.getTenders()
      setTenders(all)
      setShowTenderForm(false)
      notify(`Tender created. ${created.detected_requirements.length} requirements were extracted for review.`, 'success')
      await loadTender(created.tender)
    } catch (e) {
      notify(e.response?.data?.message || 'Tender could not be created.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const createNewBidder = async values => {
    setBusy(true)
    try {
      await api.createBidder({ ...values, tenderId: tender.id })
      setShowBidderForm(false)
      notify('Bidder added to this tender. Upload evidence to begin verification.', 'success')
      await loadTender(tender)
    } catch (e) {
      notify(e.response?.data?.message || 'Bidder could not be added.', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!signedIn) return <Login onLogin={() => setSignedIn(true)} />

  return (
    <div className="shell">
      <HeaderNav
        page={page}
        onNavigate={navigate}
        onSignOut={() => setSignedIn(false)}
      />

      <main className="workspace">
        <Topbar
          tender={tender}
          tenders={tenders}
          loadTender={loadTender}
          busy={busy}
          onNewTender={() => setShowTenderForm(true)}
        />

        <div className="toast-wrap">
          {message && (
            <button className={`toast ${message.kind}`} onClick={() => setMessage(null)}>
              {message.text}
              <span>×</span>
            </button>
          )}
        </div>

        {busy && (
          <div className="loading-banner">
            <span className="spinner" /> Syncing tender compliance data…
          </div>
        )}

        <section id="dashboard" className="scroll-section">
          <Dashboard
            tender={tender}
            bidders={bidders}
            requirements={requirements}
            intelligence={intelligence}
            onBidder={loadBidder}
            setPage={navigate}
            onNewBidder={() => setShowBidderForm(true)}
          />
        </section>

        <section id="bidders" className="scroll-section">
          <Bidders
            tender={tender}
            bidders={bidders}
            onBidder={loadBidder}
            onNewBidder={() => setShowBidderForm(true)}
          />
        </section>

        <section id="intelligence" className="scroll-section">
          <Intelligence
            intelligence={intelligence}
            bidders={bidders}
            onBidder={loadBidder}
          />
        </section>

        <section id="decisions" className="scroll-section">
          <DecisionRegister
            bidders={bidders}
            onBidder={loadBidder}
          />
        </section>

        <section id="reports" className="scroll-section">
          <Reports
            bidders={bidders}
            onBidder={loadBidder}
          />
        </section>

        {bidder && (
          <section id="casefile" className="scroll-section">
            <Report
              bidder={bidder}
              tender={tender}
              report={report}
              files={files}
              uploadType={uploadType}
              setUploadType={setUploadType}
              setUploadFile={setUploadFile}
              upload={upload}
              verify={verify}
              blacklist={blacklist}
              remarks={remarks}
              setRemarks={setRemarks}
              decide={decide}
              busy={busy}
              setPage={navigate}
            />
          </section>
        )}

        {showTenderForm && (
          <TenderModal
            onClose={() => setShowTenderForm(false)}
            onSubmit={createTender}
            busy={busy}
          />
        )}

        {showBidderForm && (
          <BidderModal
            onClose={() => setShowBidderForm(false)}
            onSubmit={createNewBidder}
            busy={busy}
          />
        )}
      </main>
    </div>
  )
}

function Login({ onLogin }) {
  const [error, setError] = useState('')
  const submit = e => {
    e.preventDefault()
    const form = new FormData(e.target)
    form.get('email') === 'officer@bigshield.ai' && form.get('password') === 'password123'
      ? onLogin()
      : setError('Use officer@bigshield.ai / password123')
  }

  return (
    <div className="login-page">
      <section className="login-card">
        <div className="login-header">
          <div className="brand-icon">B</div>
          <h2>BigShield <strong>AI</strong></h2>
          <p className="sub">AI-assisted bid compliance verification for GeM procurement.</p>
        </div>

        <form onSubmit={submit}>
          <label className="form-label">
            Official email
            <input name="email" type="email" defaultValue="officer@bigshield.ai" required />
          </label>
          <label className="form-label">
            Password
            <input name="password" type="password" defaultValue="password123" required />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-brand-btn full-w">Secure sign in <span>→</span></button>
        </form>

        <footer>Demo access · Final decision always remains with the officer</footer>
      </section>
    </div>
  )
}

function HeaderNav({ page, onNavigate, onSignOut }) {
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    if (!profileOpen) return
    const handleOutsideClick = e => {
      if (!e.target.closest('.header-profile')) setProfileOpen(false)
    }
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [profileOpen])

  return (
    <header className="main-header">
      <div className="header-left">
        <div className="logo" onClick={() => onNavigate('dashboard')} role="button" tabIndex={0}>
          <div className="logo-box">B</div>
          <div>
            BIGSHIELD<small>AI</small>
            <em>COMPLIANCE OS</em>
          </div>
        </div>
      </div>

      <nav className="nav-island">
        {[
          ['dashboard', 'Overview'],
          ['bidders', 'Bidder evaluation'],
          ['intelligence', 'Tender intelligence'],
          ['decisions', 'Decision register'],
          ['reports', 'Reports']
        ].map(([id, label]) => (
          <button
            key={id}
            className={`nav-item ${page === id ? 'nav-active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <span className="nav-icon">{icon[id]}</span>
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>

      <div className="header-right">
        <div className="header-profile">
          <button
            className={`profile-btn ${profileOpen ? 'active' : ''}`}
            onClick={() => setProfileOpen(v => !v)}
            aria-label="User Profile"
            aria-expanded={profileOpen}
          >
            <div className="avatar-wrap">
              <b className="avatar">PO</b>
              <span className="status-dot" />
            </div>
            <div className="profile-meta">
              <span className="user-name">Procurement Officer</span>
              <small className="user-role">Level 2 access</small>
            </div>
            <span className={`caret ${profileOpen ? 'open' : ''}`}>▾</span>
          </button>

          {profileOpen && (
            <div className="profile-menu">
              <div className="profile-menu-head">
                <b className="menu-avatar">PO</b>
                <div>
                  <strong>Procurement Officer</strong>
                  <p>officer@bigshield.ai</p>
                  <span className="access-badge">Level 2 Access · Active</span>
                </div>
              </div>
              <div className="profile-menu-divider" />
              <button
                className="signout-item"
                onClick={() => {
                  setProfileOpen(false)
                  onSignOut()
                }}
              >
                <span>⇥</span> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function Topbar({ tender, tenders, loadTender, busy, onNewTender }) {
  return (
    <div className="workspace-topbar">
      <div>
        <p className="workspace-crumb">PROCUREMENT / COMPLIANCE WORKSPACE</p>
        <h1 className="workspace-title">{tender?.title || 'Tender workspace'}</h1>
      </div>
      <div className="topbar-actions">
        <button className="new-tender-btn" onClick={onNewTender} disabled={busy}>
          + New tender
        </button>
        <select
          className="tender-select-dropdown"
          value={tender?.id || ''}
          disabled={busy}
          onChange={e => loadTender(tenders.find(t => t.id === Number(e.target.value)))}
        >
          {tenders.map(t => (
            <option key={t.id} value={t.id}>{t.tender_number}</option>
          ))}
        </select>
        <span className="online-badge">
          <i /> System online
        </span>
      </div>
    </div>
  )
}

function SegmentedBar({ value = 0, tone = 'green', totalSegments = 14 }) {
  const activeSegments = Math.round((Math.min(100, Math.max(0, value)) / 100) * totalSegments)
  return (
    <div className={`segmented-bar ${tone}`}>
      {Array.from({ length: totalSegments }).map((_, i) => (
        <span key={i} className={`segment ${i < activeSegments ? 'active' : ''}`} />
      ))}
    </div>
  )
}

function RiskDonutChart({ low = 0, medium = 0, high = 0, total = 0 }) {
  const tot = total || (low + medium + high) || 1
  const lowPct = low / tot
  const medPct = medium / tot
  const highPct = high / tot

  const r = 36
  const circ = 2 * Math.PI * r

  const lowDash = lowPct * circ
  const medDash = medPct * circ
  const highDash = highPct * circ

  const lowOffset = 0
  const medOffset = -lowDash
  const highOffset = -(lowDash + medDash)

  return (
    <div className="donut-wrap">
      <div className="donut-graphic">
        <svg className="donut-svg" width="92" height="92" viewBox="0 0 92 92">
          <circle cx="46" cy="46" r={r} fill="none" stroke="#edf0f5" strokeWidth="11" />
          {low > 0 && (
            <circle
              cx="46"
              cy="46"
              r={r}
              fill="none"
              stroke="#12b76a"
              strokeWidth="11"
              strokeDasharray={`${lowDash} ${circ - lowDash}`}
              strokeDashoffset={lowOffset}
              transform="rotate(-90 46 46)"
            />
          )}
          {medium > 0 && (
            <circle
              cx="46"
              cy="46"
              r={r}
              fill="none"
              stroke="#f79009"
              strokeWidth="11"
              strokeDasharray={`${medDash} ${circ - medDash}`}
              strokeDashoffset={medOffset}
              transform="rotate(-90 46 46)"
            />
          )}
          {high > 0 && (
            <circle
              cx="46"
              cy="46"
              r={r}
              fill="none"
              stroke="#f04438"
              strokeWidth="11"
              strokeDasharray={`${highDash} ${circ - highDash}`}
              strokeDashoffset={highOffset}
              transform="rotate(-90 46 46)"
            />
          )}
          <text x="46" y="44" textAnchor="middle" className="donut-center-val">{total}</text>
          <text x="46" y="56" textAnchor="middle" className="donut-center-sub">bidders</text>
        </svg>
      </div>

      <div className="donut-legend">
        <div className="legend-row">
          <span className="dot dot-green" />
          <span className="legend-label">Low risk</span>
          <b className="legend-val">{Math.round(lowPct * 100)}%</b>
        </div>
        <div className="legend-row">
          <span className="dot dot-amber" />
          <span className="legend-label">Medium</span>
          <b className="legend-val">{Math.round(medPct * 100)}%</b>
        </div>
        <div className="legend-row">
          <span className="dot dot-red" />
          <span className="legend-label">High risk</span>
          <b className="legend-val">{Math.round(highPct * 100)}%</b>
        </div>
      </div>
    </div>
  )
}

function Dashboard({ tender, bidders, requirements, intelligence, onBidder, setPage, onNewBidder }) {
  const counts = useMemo(
    () => bidders.reduce((a, b) => ({ ...a, [b.risk]: (a[b.risk] || 0) + 1 }), {}),
    [bidders]
  )

  const avgScore = useMemo(() => {
    if (!bidders.length) return 0
    return Math.round(bidders.reduce((sum, b) => sum + (b.complianceScore || 0), 0) / bidders.length)
  }, [bidders])

  return (
    <div className="dashboard-content">
      {/* ROW 1: Hero Banner + Top Stats (NovaHub Style) */}
      <div className="top-banner-row">
        {/* Left: Indigo Hero Banner */}
        <section className="hero-banner">
          <div className="hero-text-side">
            <div className="hero-badge-row">
              <span className="hero-pill">ACTIVE PROCUREMENT</span>
              <div className="hero-actions-top">
                <button className="hero-ghost-btn" onClick={() => setPage('bidders')}>
                  View analytics
                </button>
                <button className="hero-solid-btn" onClick={onNewBidder}>
                  Add bidder +
                </button>
              </div>
            </div>

            <h1 className="hero-headline">{tender?.title || 'Industrial Safety Equipment Procurement'}</h1>
            <p className="hero-subtext">
              <strong>{tender?.tender_number || 'GEM/2026/SAFETY/001'}</strong> · Track bid compliance, analyze discrepancies, and record explainable procurement decisions.
            </p>

            <div className="hero-bottom-cta">
              <button className="hero-cta-button" onClick={() => setPage('bidders')}>
                Review bidders <span>→</span>
              </button>
              <span className="hero-online-badge">
                <i /> Live Verification Active
              </span>
            </div>
          </div>

          {/* Right: SVG Mesh Wave with Tooltip */}
          <div className="hero-wave-side">
            <svg className="wave-svg" viewBox="0 0 480 180" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M0,140 C80,150 140,110 220,70 C290,38 350,55 410,25 C445,12 465,20 480,15 L480,180 L0,180 Z"
                fill="url(#waveGrad)"
              />
              <path
                d="M0,140 C80,150 140,110 220,70 C290,38 350,55 410,25 C445,12 465,20 480,15"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeOpacity="0.9"
              />
              <path
                d="M50,145 L50,180 M110,130 L110,180 M170,95 L170,180 M230,68 L230,180 M290,42 L290,180 M350,52 L350,180 M410,25 L410,180 M460,18 L460,180"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx="230" cy="68" r="4" fill="#ffffff" />
              <circle cx="230" cy="68" r="8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
            </svg>

            <div className="hero-floating-tooltip">
              <span className="tooltip-date">May 2026 · GeM Verified</span>
              <strong className="tooltip-val">{requirements.length} Requirements · {bidders.length} Bidders</strong>
            </div>
          </div>
        </section>

        {/* Right: Split Stat Card (Compliance + Donut) */}
        <div className="top-stats-card">
          <div className="stat-column">
            <span className="col-label">Total compliance</span>
            <div className="big-stat-wrap">
              <span className="big-number">{avgScore}%</span>
              <span className={`trend-chip ${avgScore >= 70 ? 'positive' : 'negative'}`}>
                {avgScore >= 70 ? `↗ +${avgScore - 70}%` : `↘ -${70 - avgScore}%`}
              </span>
            </div>
            <p className="stat-comparison">vs 70% baseline criteria</p>

            <div className="progress-section">
              <div className="progress-label-row">
                <span>Target progress</span>
                <b>{avgScore}%</b>
              </div>
              <div className="progress-track">
                <div className="progress-bar" style={{ width: `${Math.min(100, Math.max(0, avgScore))}%` }} />
              </div>
            </div>
          </div>

          <div className="stat-column border-left">
            <span className="col-label">Risk breakdown</span>
            <RiskDonutChart
              low={counts.LOW || 0}
              medium={counts.MEDIUM || 0}
              high={counts.HIGH || 0}
              total={bidders.length}
            />
          </div>
        </div>
      </div>

      {/* ROW 2: 3 Cards (NovaHub Recent Activity / Top Products / Country) */}
      <div className="middle-cards-grid">
        {/* Card 1: Recent Intelligence Signals */}
        <section className="card nova-card">
          <div className="card-top-row">
            <div>
              <h3>Recent activity</h3>
              <p className="card-sub">AI explainable evidence signals</p>
            </div>
            <button className="text-link-btn" onClick={() => setPage('intelligence')}>
              View all ›
            </button>
          </div>

          <div className="activity-feed">
            {intelligence?.signals?.length ? (
              intelligence.signals.slice(0, 4).map((signal, i) => (
                <div key={`${signal.type}-${i}`} className="activity-row">
                  <div className={`activity-icon-box ${signal.severity.toLowerCase()}`}>
                    {signal.severity === 'HIGH' ? '⚠' : signal.severity === 'MEDIUM' ? '⚡' : '✓'}
                  </div>
                  <div className="activity-body">
                    <strong>{signal.title}</strong>
                    <p>{signal.detail}</p>
                  </div>
                  <span className="activity-time">{i === 0 ? 'Now' : `${i * 3}m ago`}</span>
                </div>
              ))
            ) : (
              <div className="empty-feed">No signals flagged for this tender.</div>
            )}
          </div>
        </section>

        {/* Card 2: Top Bidders by Compliance */}
        <section className="card nova-card">
          <div className="card-top-row">
            <div>
              <h3>Top bidders by score</h3>
              <p className="card-sub">Compliance ranking & posture</p>
            </div>
            <button className="text-link-btn" onClick={() => setPage('bidders')}>
              View all ›
            </button>
          </div>

          <div className="ranking-feed">
            {bidders.length ? (
              bidders.slice(0, 4).map(b => (
                <div key={b.id} className="ranking-row" onClick={() => onBidder(b)}>
                  <div className="ranking-meta">
                    <strong>{b.company_name}</strong>
                    <span className="ranking-badge">↗ {b.complianceScore}%</span>
                  </div>
                  <SegmentedBar
                    value={b.complianceScore}
                    tone={b.complianceScore >= 80 ? 'green' : b.complianceScore >= 50 ? 'amber' : 'red'}
                    totalSegments={14}
                  />
                </div>
              ))
            ) : (
              <div className="empty-feed">No bidders registered yet.</div>
            )}
          </div>
        </section>

        {/* Card 3: Requirements Matrix */}
        <section className="card nova-card">
          <div className="card-top-row">
            <div>
              <h3>Tender requirements</h3>
              <p className="card-sub">Verification checkpoint matrix</p>
            </div>
            <span className="time-select-pill">All criteria ▾</span>
          </div>

          <div className="req-checklist">
            {requirements.slice(0, 4).map(r => (
              <div key={r.id} className="req-check-row">
                <span className={`bullet-dot ${r.mandatory ? 'mandatory' : 'optional'}`} />
                <div className="req-text">
                  <strong>{r.name}</strong>
                  <small>{r.mandatory ? 'Mandatory' : 'Optional'} · Weight {r.weight}%</small>
                </div>
                <span className="req-type-pill">{r.mandatory ? 'Strict' : 'Flexible'}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ROW 3: Bidder Evaluation Queue Table */}
      <section className="card nova-card table-section-card">
        <div className="card-top-row">
          <div>
            <h3>Bidder evaluation queue</h3>
            <p className="card-sub">Inspect evidence documents, cross-bid discrepancies, and AI recommendations</p>
          </div>
          <button className="secondary-action-btn" onClick={onNewBidder}>
            + Add bidder
          </button>
        </div>
        <BidderTable bidders={bidders} onBidder={onBidder} />
      </section>

      {/* ROW 4: Bottom 4-Metric Strip (NovaHub bottom cards) */}
      <div className="bottom-metric-row">
        <div className="metric-card">
          <div className="metric-head">
            <span className="metric-icon-square purple">👥</span>
            <span className="metric-title">Bidders under review</span>
          </div>
          <div className="metric-number">{bidders.length}</div>
          <span className="metric-hint">Registered for this tender</span>
        </div>

        <div className="metric-card">
          <div className="metric-head">
            <span className="metric-icon-square green">✓</span>
            <span className="metric-title">Low risk (Decision ready)</span>
          </div>
          <div className="metric-number">{counts.LOW || 0}</div>
          <span className="metric-hint">Ready for officer review</span>
        </div>

        <div className="metric-card">
          <div className="metric-head">
            <span className="metric-icon-square orange">⚡</span>
            <span className="metric-title">AI integrity signals</span>
          </div>
          <div className="metric-number">{intelligence?.metrics?.highSignals || 0}</div>
          <span className="metric-hint">Cross-bid conflicts detected</span>
        </div>

        <div className="metric-card">
          <div className="metric-head">
            <span className="metric-icon-square blue">📋</span>
            <span className="metric-title">Verification checkpoints</span>
          </div>
          <div className="metric-number">{requirements.length}</div>
          <span className="metric-hint">Statutory criteria checks</span>
        </div>
      </div>
    </div>
  )
}

function Bidders({ tender, bidders, onBidder, onNewBidder }) {
  return (
    <section className="card nova-card page-card">
      <div className="card-top-row">
        <div>
          <span className="section-tender-tag">{tender?.tender_number}</span>
          <h2>Bidder evaluation queue</h2>
          <p className="card-sub">Open any bidder to inspect document evidence, discrepancies, and the AI recommendation.</p>
        </div>
        <button className="primary-brand-btn" onClick={onNewBidder}>
          + Add bidder
        </button>
      </div>
      <BidderTable bidders={bidders} onBidder={onBidder} />
    </section>
  )
}

function BidderTable({ bidders, onBidder }) {
  return (
    <div className="table-responsive">
      <table className="nova-table">
        <thead>
          <tr>
            <th>Bidder</th>
            <th>Compliance score</th>
            <th>Risk level</th>
            <th>AI recommendation</th>
            <th>Officer decision</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {bidders.length ? (
            bidders.map(b => (
              <tr key={b.id}>
                <td>
                  <strong className="company-cell-title">{b.company_name}</strong>
                  <small className="company-cell-meta">{b.gstin} · {b.pan}</small>
                </td>
                <td>
                  <div className="score-cell">
                    <b>{b.complianceScore}%</b>
                    <div className="mini-progress-track">
                      <div className="mini-progress-fill" style={{ width: `${b.complianceScore}%` }} />
                    </div>
                  </div>
                </td>
                <td>
                  <span className={cx(b.risk)}>{b.risk}</span>
                </td>
                <td>
                  <strong className="recommendation-cell">{b.recommendation}</strong>
                </td>
                <td>
                  <span className={cx(b.finalStatus === 'REJECT' ? 'high' : b.finalStatus === 'ACCEPT' ? 'low' : b.finalStatus === 'REVIEW' ? 'medium' : '')}>
                    {b.finalStatus === 'PENDING_OFFICER' ? 'AWAITING DECISION' : b.finalStatus}
                  </span>
                </td>
                <td>
                  <button className="open-bidder-btn" onClick={() => onBidder(b)}>
                    Open <span>→</span>
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="table-empty-cell">
                No bidders found. Create a bidder for this tender.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function Intelligence({ intelligence, bidders, onBidder }) {
  return (
    <section className="card nova-card page-card">
      <div className="card-top-row">
        <div>
          <span className="section-tender-tag">AI INTELLIGENCE</span>
          <h2>Risk intervention queue</h2>
          <p className="card-sub">Cross-bid identity checks, document conflicts, and incomplete-evidence signals. Every alert is explainable.</p>
        </div>
      </div>

      <div className="bottom-metric-row" style={{ marginTop: 24, marginBottom: 24 }}>
        <div className="metric-card">
          <div className="metric-head">
            <span className="metric-icon-square orange">⚠</span>
            <span className="metric-title">High-priority signals</span>
          </div>
          <div className="metric-number">{intelligence?.metrics?.highSignals || 0}</div>
          <span className="metric-hint">Needs officer attention</span>
        </div>

        <div className="metric-card">
          <div className="metric-head">
            <span className="metric-icon-square green">✓</span>
            <span className="metric-title">Verified evidence</span>
          </div>
          <div className="metric-number">{intelligence?.metrics?.verifiedEvidence || 0}</div>
          <span className="metric-hint">Latest verified records</span>
        </div>

        <div className="metric-card">
          <div className="metric-head">
            <span className="metric-icon-square purple">📋</span>
            <span className="metric-title">Recorded decisions</span>
          </div>
          <div className="metric-number">{intelligence?.metrics?.decisions || 0}</div>
          <span className="metric-hint">Officer audit trail</span>
        </div>

        <div className="metric-card">
          <div className="metric-head">
            <span className="metric-icon-square blue">👥</span>
            <span className="metric-title">Bidders monitored</span>
          </div>
          <div className="metric-number">{intelligence?.metrics?.bidders || 0}</div>
          <span className="metric-hint">Current tender queue</span>
        </div>
      </div>

      <div className="signals-full-list">
        {intelligence?.signals?.length ? (
          intelligence.signals.map((signal, i) => (
            <div key={`${signal.type}-${i}`} className="signal-card-row">
              <span className={cx(signal.severity)}>{signal.severity}</span>
              <div className="signal-details">
                <strong>{signal.title}</strong>
                <p>{signal.detail}</p>
              </div>
              {signal.bidderId && (
                <button
                  className="open-bidder-btn"
                  onClick={() => onBidder(bidders.find(x => x.id === signal.bidderId))}
                >
                  Open bidder →
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="empty-feed">No risk signals currently flagged.</p>
        )}
      </div>
    </section>
  )
}

function DecisionRegister({ bidders, onBidder }) {
  const decided = bidders.filter(b => b.officerDecision)

  return (
    <section className="card nova-card page-card">
      <div className="card-top-row">
        <div>
          <span className="section-tender-tag">OFFICER AUDIT TRAIL</span>
          <h2>Decision register</h2>
          <p className="card-sub">Final decisions are separate from AI recommendations and remain fully attributable to the procurement officer.</p>
        </div>
      </div>

      <div className="table-responsive" style={{ marginTop: 20 }}>
        <table className="nova-table">
          <thead>
            <tr>
              <th>Bidder</th>
              <th>Decision</th>
              <th>Remarks</th>
              <th>Recorded at</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {decided.length ? (
              decided.map(b => (
                <tr key={b.id}>
                  <td><strong>{b.company_name}</strong></td>
                  <td>
                    <span className={cx(b.finalStatus === 'REJECT' ? 'high' : b.finalStatus === 'ACCEPT' ? 'low' : 'medium')}>
                      {b.finalStatus}
                    </span>
                  </td>
                  <td>{b.officerDecision.remarks || 'No remarks recorded'}</td>
                  <td>{new Date(b.officerDecision.created_at).toLocaleString()}</td>
                  <td>
                    <button className="open-bidder-btn" onClick={() => onBidder(b)}>
                      Open →
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="table-empty-cell">
                  No officer decisions recorded for this tender.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Reports({ bidders, onBidder }) {
  return (
    <section className="card nova-card page-card">
      <div className="card-top-row">
        <div>
          <span className="section-tender-tag">COMPLIANCE REPORTS</span>
          <h2>Evidence-led decisions</h2>
          <p className="card-sub">Each report retains document evidence, verification reasoning, and a separately recorded officer decision.</p>
        </div>
      </div>

      <div className="reports-cards-grid">
        {bidders.map(b => (
          <div className="report-card-tile" key={b.id} onClick={() => onBidder(b)}>
            <div className="tile-top">
              <span className={cx(b.risk)}>{b.risk}</span>
              <span className="score-big">{b.complianceScore}%</span>
            </div>
            <h3>{b.company_name}</h3>
            <small className="rec-text">{b.recommendation}</small>
            <div className="tile-footer">
              <span>View full audit dossier</span>
              <b>→</b>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Report({ bidder, tender, report, files, uploadType, setUploadType, setUploadFile, upload, verify, blacklist, remarks, setRemarks, decide, busy, setPage }) {
  return (
    <div className="casefile-wrap">
      <button className="back-nav-btn" onClick={() => setPage('dashboard')}>
        ← Back to dashboard
      </button>

      <section className="card nova-card casefile-hero">
        <div className="casefile-hero-info">
          <span className="section-tender-tag">COMPLIANCE VERIFICATION DOSSIER</span>
          <h2>{bidder.company_name}</h2>
          <p className="casefile-sub">{tender?.title} · <strong>{tender?.tender_number}</strong></p>
          <div className="id-badges-row">
            <span>GSTIN: <b>{bidder.gstin || '—'}</b></span>
            <span>PAN: <b>{bidder.pan || '—'}</b></span>
          </div>
        </div>

        <div className="casefile-score-panel">
          <div className="score-metric">
            <span className="score-num">{report?.complianceScore ?? 0}<b>%</b></span>
            <span className="score-text">Overall Compliance</span>
          </div>
          <span className={cx(report?.risk)}>{report?.risk} RISK</span>
        </div>
      </section>

      <div className="casefile-grid">
        <section className="card nova-card evidence-col">
          <div className="card-top-row">
            <div>
              <h3>Requirement-level assessment</h3>
              <p className="card-sub">Deterministic field extraction & registry checks</p>
            </div>
            <button className="secondary-action-btn" onClick={blacklist} disabled={busy}>
              Run blacklist check
            </button>
          </div>

          <div className="evidence-list-wrap">
            {report?.requirements?.map((r, i) => (
              <article key={r.requirement} className="evidence-article">
                <div className="evidence-header">
                  <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
                  <div className="evidence-title">
                    <h4>{r.requirement}</h4>
                    <p>{r.mandatory ? 'Mandatory checkpoint' : 'Optional'} · Weight {r.weight}%</p>
                  </div>
                  <span className={cx(r.status)}>{r.status}</span>
                </div>

                <p className="evidence-reason">{r.reason}</p>

                <div className="evidence-meta-grid">
                  <div className="meta-box">
                    <span>Submitted value</span>
                    <b>{r.submitted_value || 'Not available'}</b>
                  </div>
                  <div className="meta-box">
                    <span>Verified value</span>
                    <b>{r.verified_value || 'Not available'}</b>
                  </div>
                  <div className="meta-box">
                    <span>Confidence</span>
                    <b>{r.confidence ? `${Math.round(r.confidence <= 1 ? r.confidence * 100 : r.confidence)}%` : '—'}</b>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="casefile-side-col">
          <section className="card nova-card side-widget">
            <span className="widget-label">AI ASSESSMENT</span>
            <h3>{report?.recommendation}</h3>
            <p className="card-sub">
              {report?.mandatoryFailure
                ? 'Mandatory evidence failed or is missing. Officer intervention required.'
                : 'Assessment is based on verified document extractions and mock registry checkpoints.'}
            </p>
            {report?.discrepancies?.length > 0 && (
              <div className="discrepancy-feed">
                {report.discrepancies.map(x => (
                  <p key={x.affected_requirement} className="discrepancy-item">
                    <span className={cx(x.severity)}>{x.severity}</span>
                    {x.message}
                  </p>
                ))}
              </div>
            )}
          </section>

          <section className="card nova-card side-widget upload-widget">
            <span className="widget-label">EVIDENCE INTAKE</span>
            <h3>Upload PDF evidence</h3>
            <p className="card-sub">Select requirement, upload document, and trigger AI verification.</p>

            <form onSubmit={upload} className="evidence-upload-form">
              <label className="form-label">
                Requirement
                <select value={uploadType} onChange={e => setUploadType(e.target.value)}>
                  {Object.entries(documents).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>

              <label className="nova-dropzone">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => setUploadFile(e.target.files?.[0])}
                />
                <span className="dropzone-icon">📄</span>
                <strong>Choose PDF or drag here</strong>
                <small>PDF format · up to 10 MB</small>
              </label>

              <button className="primary-brand-btn full-w" disabled={busy}>
                Upload and queue verification
              </button>
            </form>

            <div className="uploaded-docs-list">
              {files.filter(f => f.document_type !== 'BLACKLIST').map(f => (
                <div key={f.id} className="doc-row">
                  <span className="doc-tag">PDF</span>
                  <div className="doc-info">
                    <strong>{f.file_name}</strong>
                    <small>{documents[f.document_type] || f.document_type}</small>
                  </div>
                  <button className="verify-inline-btn" onClick={() => verify(f)} disabled={busy}>
                    Verify
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="card nova-card side-widget decision-widget">
            <span className="widget-label">OFFICER FINAL DECISION</span>
            <h3>{report?.officerDecision ? report.officerDecision.decision : 'Awaiting decision'}</h3>
            <p className="card-sub">Rejections require written reasons and are recorded in the official audit trail.</p>

            <textarea
              className="remarks-textarea"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Record the official rationale, discrepancy findings, or approval notes…"
            />

            <div className="decision-btn-row">
              <button className="btn-accept" onClick={() => decide('ACCEPT')} disabled={busy}>
                Accept
              </button>
              <button className="btn-review" onClick={() => decide('REVIEW')} disabled={busy}>
                Review
              </button>
              <button className="btn-reject" onClick={() => decide('REJECT')} disabled={busy}>
                Reject
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function TenderModal({ onClose, onSubmit, busy }) {
  const [file, setFile] = useState(null)
  const submit = e => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    if (!file) return
    onSubmit({
      title: data.get('title'),
      tenderNumber: data.get('tenderNumber'),
      description: data.get('description'),
      document: file
    })
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={submit}>
        <div className="modal-top">
          <div>
            <span className="section-tender-tag">TENDER INTAKE</span>
            <h2>Create tender workspace</h2>
          </div>
          <button type="button" className="close-x-btn" onClick={onClose}>×</button>
        </div>
        <p className="card-sub">Upload the tender specification document. Compliance criteria will be extracted automatically.</p>

        <label className="form-label">
          Tender title
          <input name="title" required placeholder="e.g. Industrial safety equipment procurement" />
        </label>

        <label className="form-label">
          Tender number
          <input name="tenderNumber" required placeholder="e.g. GEM/2026/SAFETY/002" />
        </label>

        <label className="form-label">
          Description
          <textarea name="description" placeholder="Scope, statutory criteria, or evaluation parameters…" />
        </label>

        <label className="nova-dropzone">
          <input type="file" accept="application/pdf" required onChange={e => setFile(e.target.files?.[0] || null)} />
          <span className="dropzone-icon">📄</span>
          <strong>{file ? file.name : 'Select tender PDF'}</strong>
          <small>PDF only · requirements will be parsed</small>
        </label>

        <div className="modal-actions-row">
          <button type="button" className="secondary-action-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-brand-btn" disabled={busy || !file}>
            Create tender workspace
          </button>
        </div>
      </form>
    </div>
  )
}

function BidderModal({ onClose, onSubmit, busy }) {
  const submit = e => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    onSubmit({
      companyName: data.get('companyName'),
      gstin: data.get('gstin'),
      pan: data.get('pan')
    })
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal-card compact" onSubmit={submit}>
        <div className="modal-top">
          <div>
            <span className="section-tender-tag">BIDDER INTAKE</span>
            <h2>Add bidder</h2>
          </div>
          <button type="button" className="close-x-btn" onClick={onClose}>×</button>
        </div>
        <p className="card-sub">Register a bidder company to this tender to evaluate compliance evidence.</p>

        <label className="form-label">
          Company name
          <input name="companyName" required placeholder="Registered company name" />
        </label>

        <label className="form-label">
          GSTIN <span className="optional-tag">Optional</span>
          <input name="gstin" placeholder="15-character GSTIN" />
        </label>

        <label className="form-label">
          PAN <span className="optional-tag">Optional</span>
          <input name="pan" placeholder="10-character PAN" />
        </label>

        <div className="modal-actions-row">
          <button type="button" className="secondary-action-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-brand-btn" disabled={busy}>
            Add bidder
          </button>
        </div>
      </form>
    </div>
  )
}

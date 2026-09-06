import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminAuditLogs, type AuditLogEntry } from '../../services/bulkImportApi'
import { SectionCard } from '../../components/ui/SectionCard'
import { StatCard } from '../../components/ui/StatCard'

export function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [tableFilter, setTableFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const loadLogs = async () => {
    setIsLoading(true)
    setError('')
    try {
      const records = await getAdminAuditLogs(150, actionFilter, tableFilter, searchQuery)
      setLogs(records)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve system audit logs.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadLogs()
  }, [actionFilter, tableFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void loadLogs()
  }

  const importCount = logs.filter((l) => l.action.toLowerCase() === 'import').length
  const updateCount = logs.filter((l) => l.action.toLowerCase() === 'update').length
  const createCount = logs.filter((l) => l.action.toLowerCase() === 'create').length

  return (
    <div className="grid stagger" style={{ gap: '1.5rem' }}>
      {/* ── Page Header ── */}
      <header className="dashboard-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="eyebrow">Enterprise Compliance & Security</p>
          <h1 className="headline" style={{ fontSize: '2.2rem', margin: '0.2rem 0' }}>Institutional Audit Trail</h1>
          <p className="subtle" style={{ fontSize: '0.95rem' }}>Immutable logs of all administrative mutations, bulk imports, and record edits.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <Link to="/admin/bulk-import" className="button" style={{ background: 'var(--accent)', color: '#FFFFFF', fontWeight: 700, borderRadius: '8px', border: 'none', padding: '0.5rem 1.1rem' }}>
            Bulk Data Import
          </Link>
          <Link to="/admin" className="button" style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--text)', borderRadius: '8px', padding: '0.5rem 1.1rem' }}>
            Admin Dashboard
          </Link>
        </div>
      </header>

      <section className="grid kpi">
        <StatCard title="Total Audited Events" value={logs.length.toString()} subtitle="Current filter view" />
        <StatCard title="Bulk Imports Logged" value={importCount.toString()} subtitle="Batch ingestion events" />
        <StatCard title="Record Updates" value={updateCount.toString()} subtitle="Field modifications" />
        <StatCard title="New Entities Created" value={createCount.toString()} subtitle="Entity creations" />
      </section>

      {/* ── Filter Toolbar ── */}
      <SectionCard title="Filter & Search Logs" subtitle="Filter by action type, table resource, or user email:">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1', minWidth: '220px' }}>
            <input
              type="text"
              placeholder="Search user email or student ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--text)' }}
            />
          </div>
          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{ padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--text)' }}
            >
              <option value="all">All Actions</option>
              <option value="import">Import</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>
          <div>
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              style={{ padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--text)' }}
            >
              <option value="all">All Tables</option>
              <option value="students">Students</option>
              <option value="academics">Academics</option>
              <option value="attendance">Attendance</option>
              <option value="skills">Skills</option>
              <option value="placement">Placement</option>
              <option value="portfolio">Portfolio</option>
              <option value="risk">Risk</option>
              <option value="unified">Unified</option>
            </select>
          </div>
          <button type="submit" className="button" style={{ background: 'var(--accent)', color: '#FFFFFF', fontWeight: 700, borderRadius: '8px', border: 'none', padding: '0.6rem 1.25rem' }}>
            Search
          </button>
        </form>
      </SectionCard>

      {error && (
        <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(240, 84, 106, 0.12)', border: '1px solid rgba(240, 84, 106, 0.3)', color: '#f0546a' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Audit Logs Table ── */}
      <SectionCard title="Audit Event Log" subtitle="Showing verified immutable operational audit entries:">
        {isLoading ? (
          <div className="loading" style={{ padding: '2rem' }}>Loading system audit trail...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-subtle)' }}>
            <p style={{ margin: 0, fontSize: '1rem' }}>No audit events found matching the criteria.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.86rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.7rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Timestamp</th>
                  <th style={{ padding: '0.7rem', textAlign: 'left', color: 'var(--text-subtle)' }}>User</th>
                  <th style={{ padding: '0.7rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Action</th>
                  <th style={{ padding: '0.7rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Target Table</th>
                  <th style={{ padding: '0.7rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Student ID</th>
                  <th style={{ padding: '0.7rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Field</th>
                  <th style={{ padding: '0.7rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Old Value</th>
                  <th style={{ padding: '0.7rem', textAlign: 'left', color: 'var(--text-subtle)' }}>New Value</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '0.7rem', color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.7rem', fontWeight: 600 }}>{entry.user_email}</td>
                    <td style={{ padding: '0.7rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background:
                            entry.action.toLowerCase() === 'import'
                              ? 'rgba(255, 107, 53, 0.15)'
                              : entry.action.toLowerCase() === 'create'
                              ? 'rgba(47, 212, 196, 0.15)'
                              : 'rgba(242, 169, 59, 0.15)',
                          color:
                            entry.action.toLowerCase() === 'import'
                              ? 'var(--accent)'
                              : entry.action.toLowerCase() === 'create'
                              ? 'var(--teal)'
                              : '#f2a93b',
                        }}
                      >
                        {entry.action.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.7rem', fontFamily: 'monospace' }}>{entry.table_name}</td>
                    <td style={{ padding: '0.7rem', fontWeight: 600 }}>{entry.student_id || 'All / Master'}</td>
                    <td style={{ padding: '0.7rem', color: 'var(--text-subtle)' }}>{entry.field_changed || '—'}</td>
                    <td style={{ padding: '0.7rem', color: 'var(--text-muted)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.old_value || ''}>
                      {entry.old_value || '—'}
                    </td>
                    <td style={{ padding: '0.7rem', color: 'var(--teal)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.new_value || ''}>
                      {entry.new_value || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

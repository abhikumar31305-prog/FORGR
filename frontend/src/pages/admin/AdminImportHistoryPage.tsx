import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getImportHistory,
  getImportBatchErrors,
  downloadImportErrorReport,
  type ImportHistoryRecord,
} from '../../services/bulkImportApi'
import { SectionCard } from '../../components/ui/SectionCard'
import { StatCard } from '../../components/ui/StatCard'

export function AdminImportHistoryPage() {
  const [history, setHistory] = useState<ImportHistoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedBatchErrors, setSelectedBatchErrors] = useState<{
    batch_id: string
    file_name: string
    status: string
    failed_rows: number
    errors: unknown[]
  } | null>(null)
  const [loadingBatchId, setLoadingBatchId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError('')
      try {
        const records = await getImportHistory(100)
        setHistory(records)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load import history.')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [])

  const handleViewErrors = async (batchId: string) => {
    setLoadingBatchId(batchId)
    try {
      const data = await getImportBatchErrors(batchId)
      setSelectedBatchErrors(data)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to load batch error details.')
    } finally {
      setLoadingBatchId(null)
    }
  }

  const totalProcessed = history.reduce((acc, h) => acc + h.total_rows, 0)
  const totalInserted = history.reduce((acc, h) => acc + h.inserted_rows, 0)
  const totalUpdated = history.reduce((acc, h) => acc + h.updated_rows, 0)

  return (
    <div className="grid stagger" style={{ gap: '1.5rem' }}>
      {/* ── Page Header ── */}
      <header className="dashboard-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="eyebrow">Institutional Data Governance</p>
          <h1 className="headline" style={{ fontSize: '2.2rem', margin: '0.2rem 0' }}>Bulk Import History</h1>
          <p className="subtle" style={{ fontSize: '0.95rem' }}>Review all institutional batch uploads, validation reports, and synchronization logs.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <Link to="/admin/bulk-import" className="button" style={{ background: 'var(--accent)', color: '#0c0e12', fontWeight: 700 }}>
            ➕ New Bulk Import
          </Link>
          <Link to="/admin" className="button" style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--text)' }}>
            Admin Dashboard
          </Link>
        </div>
      </header>

      <section className="grid kpi">
        <StatCard title="Total Batches" value={history.length.toString()} subtitle="Import logs recorded" />
        <StatCard title="Total Rows Ingested" value={totalProcessed.toLocaleString()} subtitle="Across all batches" />
        <StatCard title="Inserted Records" value={totalInserted.toLocaleString()} subtitle="New student rows" />
        <StatCard title="Updated Records" value={totalUpdated.toLocaleString()} subtitle="Existing synced rows" />
      </section>

      {error && (
        <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(240, 84, 106, 0.12)', border: '1px solid rgba(240, 84, 106, 0.3)', color: '#f0546a' }}>
          ⚠️ {error}
        </div>
      )}

      <SectionCard title="Historical Import Log" subtitle="Comprehensive record of institutional imports with modes and counts:">
        {isLoading ? (
          <div className="loading" style={{ padding: '2rem' }}>Loading import history records...</div>
        ) : history.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-subtle)' }}>
            <p style={{ margin: 0, fontSize: '1rem' }}>No bulk import records found yet.</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>Uploaded batches will appear here with detailed records and error downloads.</p>
          </div>
        ) : (
          <div style={{
            overflowX: 'auto',
            marginTop: '0.5rem',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            WebkitOverflowScrolling: 'touch',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <table className="table" style={{ width: '100%', minWidth: '920px', fontSize: '0.84rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Batch ID</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Date / Time</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Admin</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Dataset Type</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: 'var(--text-subtle)' }}>File Name</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Mode</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Counts (Ins/Upd/Fail)</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Status</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: 'var(--text-subtle)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => (
                  <tr key={record.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: 'var(--text)',
                        background: 'rgba(255, 90, 40, 0.08)',
                        border: '1px solid rgba(255, 90, 40, 0.22)',
                        padding: '3px 8px',
                        borderRadius: '5px'
                      }}>
                        {record.import_batch_id}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-subtle)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {new Date(record.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text)', fontWeight: 500, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={record.admin_email}>
                      {record.admin_email}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'rgba(95, 168, 196, 0.14)',
                        border: '1px solid rgba(95, 168, 196, 0.3)',
                        color: '#6bb6d4',
                        letterSpacing: '0.04em'
                      }}>
                        {record.dataset_type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }} title={record.file_name}>
                      {record.file_name}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: 'var(--surface-subtle)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)'
                      }}>
                        {record.import_mode.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                      <span style={{ color: 'var(--patina)', fontWeight: 600 }}>+{record.inserted_rows}</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
                      <span style={{ color: 'var(--amber)', fontWeight: 600 }}>~{record.updated_rows}</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
                      <span style={{ color: record.failed_rows > 0 ? '#ff5a5f' : 'var(--text-muted)', fontWeight: 600 }}>!{record.failed_rows}</span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: record.status === 'Completed'
                            ? 'rgba(95, 163, 127, 0.16)'
                            : record.status === 'Failed'
                            ? 'rgba(255, 90, 40, 0.16)'
                            : 'rgba(232, 162, 61, 0.16)',
                          color: record.status === 'Completed'
                            ? '#6fc797'
                            : record.status === 'Failed'
                            ? '#ff6b57'
                            : '#e8a848',
                          border: `1px solid ${
                            record.status === 'Completed'
                              ? 'rgba(95, 163, 127, 0.35)'
                              : record.status === 'Failed'
                              ? 'rgba(255, 90, 40, 0.35)'
                              : 'rgba(232, 162, 61, 0.35)'
                          }`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: record.status === 'Completed' ? '#6fc797' : record.status === 'Failed' ? '#ff6b57' : '#e8a848'
                        }} />
                        {record.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="button"
                          disabled={loadingBatchId === record.import_batch_id}
                          onClick={() => handleViewErrors(record.import_batch_id)}
                          style={{
                            fontSize: '0.78rem',
                            padding: '0.35rem 0.75rem',
                            border: '1px solid var(--border)',
                            background: 'var(--surface-subtle)',
                            color: 'var(--text)',
                            borderRadius: '6px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          className="button"
                          onClick={() => downloadImportErrorReport(record.import_batch_id)}
                          style={{
                            fontSize: '0.78rem',
                            padding: '0.35rem 0.75rem',
                            border: '1px solid rgba(255, 90, 40, 0.35)',
                            background: 'rgba(255, 90, 40, 0.12)',
                            color: '#ff7547',
                            borderRadius: '6px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Download CSV 📥
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ── Batch Error / Log Details Modal ── */}
      {selectedBatchErrors && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '780px',
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--accent)', fontWeight: 700 }}>
                Batch Details: <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--text)' }}>{selectedBatchErrors.batch_id}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedBatchErrors(null)}
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
                  transition: 'all 0.15s ease'
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', color: 'var(--text-subtle)' }}>
              File: <strong style={{ color: 'var(--text)' }}>{selectedBatchErrors.file_name}</strong> · Status: <strong style={{ color: selectedBatchErrors.status === 'Completed' ? 'var(--patina)' : '#ff6b57' }}>{selectedBatchErrors.status}</strong> · Failed rows: <strong style={{ color: selectedBatchErrors.failed_rows > 0 ? '#ff6b57' : 'var(--text)' }}>{selectedBatchErrors.failed_rows}</strong>
            </p>

            <div style={{ background: 'var(--surface-subtle)', borderRadius: '10px', padding: '1.25rem', border: '1px solid var(--border)', maxHeight: '380px', overflowY: 'auto' }}>
              {selectedBatchErrors.errors.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--patina)', fontSize: '0.88rem', fontWeight: 600 }}>✓ No row-level errors logged for this batch.</p>
              ) : (
                <pre style={{ margin: 0, fontSize: '0.82rem', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                  {JSON.stringify(selectedBatchErrors.errors, null, 2)}
                </pre>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="button"
                onClick={() => downloadImportErrorReport(selectedBatchErrors.batch_id)}
                style={{ background: 'var(--accent)', color: '#FFFFFF !important', fontWeight: 700, fontSize: '0.86rem', border: 'none', borderRadius: '8px', padding: '0.5rem 1.2rem' }}
              >
                Download Error Report (CSV) 📥
              </button>
              <button
                type="button"
                className="button"
                onClick={() => setSelectedBatchErrors(null)}
                style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--text) !important', fontSize: '0.86rem', borderRadius: '8px', padding: '0.5rem 1.2rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

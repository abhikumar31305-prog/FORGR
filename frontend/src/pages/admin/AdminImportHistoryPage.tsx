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
          <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.86rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.7rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Batch ID</th>
                  <th style={{ padding: '0.7rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Date / Time</th>
                  <th style={{ padding: '0.7rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Admin</th>
                  <th style={{ padding: '0.7rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Dataset Type</th>
                  <th style={{ padding: '0.7rem', textAlign: 'left', color: 'var(--text-subtle)' }}>File Name</th>
                  <th style={{ padding: '0.7rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Mode</th>
                  <th style={{ padding: '0.7rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Counts (Ins/Upd/Fail)</th>
                  <th style={{ padding: '0.7rem', textAlign: 'left', color: 'var(--text-subtle)' }}>Status</th>
                  <th style={{ padding: '0.7rem', textAlign: 'right', color: 'var(--text-subtle)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => (
                  <tr key={record.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '0.7rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent)' }}>
                      {record.import_batch_id}
                    </td>
                    <td style={{ padding: '0.7rem', color: 'var(--text-subtle)' }}>
                      {new Date(record.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.7rem' }}>{record.admin_email}</td>
                    <td style={{ padding: '0.7rem', fontWeight: 600 }}>{record.dataset_type.toUpperCase()}</td>
                    <td style={{ padding: '0.7rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={record.file_name}>
                      {record.file_name}
                    </td>
                    <td style={{ padding: '0.7rem' }}>
                      <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                        {record.import_mode.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.7rem' }}>
                      <span style={{ color: 'var(--teal)' }}>+{record.inserted_rows}</span> / <span style={{ color: '#f2a93b' }}>~{record.updated_rows}</span> / <span style={{ color: record.failed_rows > 0 ? '#f0546a' : 'var(--text-muted)' }}>!{record.failed_rows}</span>
                    </td>
                    <td style={{ padding: '0.7rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: record.status === 'Completed' ? 'rgba(47, 212, 196, 0.15)' : record.status === 'Failed' ? 'rgba(240, 84, 106, 0.15)' : 'rgba(242, 169, 59, 0.15)',
                          color: record.status === 'Completed' ? 'var(--teal)' : record.status === 'Failed' ? '#f0546a' : '#f2a93b',
                        }}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.7rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="button"
                          disabled={loadingBatchId === record.import_batch_id}
                          onClick={() => handleViewErrors(record.import_batch_id)}
                          style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem', border: '1px solid var(--border)', background: 'var(--surface-subtle)' }}
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          className="button"
                          onClick={() => downloadImportErrorReport(record.import_batch_id)}
                          style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem', border: '1px solid var(--border)', background: 'transparent' }}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ background: '#13161c', border: '1px solid var(--border)', borderRadius: '12px', width: '100%', maxWidth: '750px', maxHeight: '80vh', overflowY: 'auto', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent)' }}>Batch Details: {selectedBatchErrors.batch_id}</h3>
              <button
                type="button"
                onClick={() => setSelectedBatchErrors(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-subtle)', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-subtle)' }}>
              File: {selectedBatchErrors.file_name} · Status: {selectedBatchErrors.status} · Failed rows: {selectedBatchErrors.failed_rows}
            </p>

            <div style={{ background: 'var(--surface-subtle)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--border)', maxHeight: '350px', overflowY: 'auto' }}>
              {selectedBatchErrors.errors.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--teal)', fontSize: '0.85rem' }}>No row-level errors logged for this batch.</p>
              ) : (
                <pre style={{ margin: 0, fontSize: '0.8rem', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                  {JSON.stringify(selectedBatchErrors.errors, null, 2)}
                </pre>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1.2rem' }}>
              <button
                type="button"
                className="button"
                onClick={() => downloadImportErrorReport(selectedBatchErrors.batch_id)}
                style={{ background: 'var(--accent)', color: '#0c0e12', fontWeight: 700, fontSize: '0.85rem' }}
              >
                Download Error Report (CSV)
              </button>
              <button
                type="button"
                className="button"
                onClick={() => setSelectedBatchErrors(null)}
                style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--text)', fontSize: '0.85rem' }}
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

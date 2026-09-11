import { useActiveStudentId } from '../context/useActiveStudentId'

export function CohortStudentPicker() {
  const { canPick, studentId, students, setStudentId, needsSelection } = useActiveStudentId()
  if (!canPick) return null

  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'var(--steel-2, var(--surface))',
        padding: '6px 12px',
        borderRadius: '10px',
        border: '1px solid var(--line-soft, var(--border))',
        fontSize: '0.82rem',
      }}
    >
      <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Student</span>
      <select
        value={studentId ?? ''}
        onChange={(event) => setStudentId(event.target.value)}
        style={{
          minWidth: '160px',
          padding: '4px 8px',
          fontSize: '0.85rem',
          fontWeight: 600,
          borderRadius: '6px',
        }}
      >
        {needsSelection ? <option value="">Select a student</option> : null}
        {students.map((student) => (
          <option key={student.student_id} value={student.student_id}>
            {student.student_id} — {student.name}
          </option>
        ))}
      </select>
    </label>
  )
}

export function StudentRecordGate({ children }: { children: React.ReactNode }) {
  const { studentId, missingLinked, needsSelection } = useActiveStudentId()

  if (missingLinked) {
    return (
      <div className="fg-error">
        No linked student profile on this account. Import student data and sign in again.
      </div>
    )
  }

  if (needsSelection || !studentId) {
    return (
      <div className="fg-error">
        Select a student from the list in the header to view records.
      </div>
    )
  }

  return <>{children}</>
}

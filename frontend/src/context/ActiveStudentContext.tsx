import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getStudents } from '../services/studentsApi'
import type { Student } from '../types/domain'
import type { Role } from '../types/auth'
import { useAuth } from './useAuth'
import { ActiveStudentContext } from './activeStudentContextDef'

const PICKER_ROLES: Role[] = ['admin', 'faculty', 'placement_cell', 'recruiter']
const STORAGE_KEY = 'forgr_active_student_id'

export function ActiveStudentProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const canPick = Boolean(session && PICKER_ROLES.includes(session.role))
  const linkedId = session?.studentId ?? null

  const [students, setStudents] = useState<Student[]>([])
  const [pickedId, setPickedId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })

  useEffect(() => {
    let cancelled = false
    if (canPick) {
      void getStudents()
        .then((rows) => {
          if (!cancelled) setStudents(Array.isArray(rows) ? rows : [])
        })
        .catch(() => {
          if (!cancelled) setStudents([])
        })
    }
    return () => {
      cancelled = true
    }
  }, [canPick, session?.id])

  const setStudentId = useCallback((id: string) => {
    setPickedId(id)
    try {
      sessionStorage.setItem(STORAGE_KEY, id)
    } catch {
      void 0
    }
  }, [])

  const studentId = canPick ? pickedId : linkedId
  const missingLinked =
    Boolean(session) && !canPick && (session?.role === 'student' || session?.role === 'parent') && !linkedId
  const needsSelection = canPick && !studentId

  const value = useMemo(() => {
    const effectiveStudents = canPick ? students : []
    return {
      studentId,
      students: effectiveStudents,
      canPick,
      missingLinked,
      needsSelection,
      setStudentId,
    }
  }, [studentId, students, canPick, missingLinked, needsSelection, setStudentId])

  return <ActiveStudentContext.Provider value={value}>{children}</ActiveStudentContext.Provider>
}

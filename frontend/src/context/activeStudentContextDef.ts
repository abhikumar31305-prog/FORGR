import { createContext } from 'react'
import type { Student } from '../types/domain'

export interface ActiveStudentContextValue {
  studentId: string | null
  students: Student[]
  canPick: boolean
  missingLinked: boolean
  needsSelection: boolean
  setStudentId: (id: string) => void
}

export const ActiveStudentContext = createContext<ActiveStudentContextValue | undefined>(undefined)

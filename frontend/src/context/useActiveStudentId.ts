import { useContext } from 'react'
import { ActiveStudentContext } from './activeStudentContextDef'

export function useActiveStudentId() {
  const context = useContext(ActiveStudentContext)
  if (!context) {
    throw new Error('useActiveStudentId must be used within ActiveStudentProvider')
  }
  return context
}

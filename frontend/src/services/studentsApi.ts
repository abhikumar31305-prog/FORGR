import { apiRequest } from '../api/client'
import type { Student } from '../types/domain'

export async function getStudents(): Promise<Student[]> {
  return apiRequest<Student[]>('/students')
}

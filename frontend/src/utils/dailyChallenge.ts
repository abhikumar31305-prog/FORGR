export interface ChallengeQuestion {
  id: string
  category: 'Aptitude' | 'SQL' | 'Data Structures' | 'Python' | 'System & Networks'
  topic: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  question: string
  codeSnippet?: string
  options: string[]
  correctIndex: number
  explanation: string
}

const QUESTION_BANK: ChallengeQuestion[] = [
  {
    id: 'q1',
    category: 'SQL',
    topic: 'Aggregations & Grouping',
    difficulty: 'Medium',
    question: 'Which query correctly retrieves departments where the average employee salary exceeds $75,000?',
    codeSnippet: 'SELECT department, AVG(salary) FROM employees ...',
    options: [
      'WHERE AVG(salary) > 75000 GROUP BY department',
      'GROUP BY department HAVING AVG(salary) > 75000',
      'GROUP BY department WHERE salary > 75000',
      'HAVING AVG(salary) > 75000 GROUP BY department',
    ],
    correctIndex: 1,
    explanation: 'The HAVING clause is used to filter results of aggregate functions like AVG(). WHERE cannot be applied directly to aggregate functions after GROUP BY.',
  },
  {
    id: 'q2',
    category: 'Data Structures',
    topic: 'Time Complexity',
    difficulty: 'Easy',
    question: 'What is the worst-case time complexity of searching for an element in a balanced Binary Search Tree (AVL or Red-Black)?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctIndex: 1,
    explanation: 'A balanced BST guarantees height of O(log n). Therefore, searching, inserting, and deleting operations all take O(log n) in the worst case.',
  },
  {
    id: 'q3',
    category: 'Aptitude',
    topic: 'Time & Work',
    difficulty: 'Medium',
    question: 'Pipe A can fill a tank in 6 hours and Pipe B can empty it in 8 hours. If both pipes are opened simultaneously, how long will it take to fill the empty tank?',
    options: ['12 hours', '18 hours', '24 hours', '30 hours'],
    correctIndex: 2,
    explanation: 'Net rate per hour = (1/6 - 1/8) = (4 - 3)/24 = 1/24 tank per hour. Thus, the tank will be filled in 24 hours.',
  },
  {
    id: 'q4',
    category: 'Python',
    topic: 'List Comprehensions & Mutability',
    difficulty: 'Easy',
    question: 'What will be the output of the following Python expression: [x**2 for x in range(5) if x % 2 != 0]?',
    options: ['[1, 9]', '[0, 4, 16]', '[1, 4, 9]', '[1, 9, 25]'],
    correctIndex: 0,
    explanation: 'range(5) gives 0, 1, 2, 3, 4. The odd numbers are 1 and 3. Their squares are 1**2 = 1 and 3**2 = 9, producing [1, 9].',
  },
  {
    id: 'q5',
    category: 'Aptitude',
    topic: 'Speed & Distance',
    difficulty: 'Medium',
    question: 'A train 150 meters long passes a telegraph post in 10 seconds. What is the speed of the train in kilometers per hour?',
    options: ['45 km/h', '54 km/h', '60 km/h', '72 km/h'],
    correctIndex: 1,
    explanation: 'Speed = Distance / Time = 150 m / 10 s = 15 m/s. Converting to km/h: 15 * (18 / 5) = 54 km/h.',
  },
  {
    id: 'q6',
    category: 'SQL',
    topic: 'JOIN Operations',
    difficulty: 'Medium',
    question: 'What is the key difference between an INNER JOIN and a LEFT JOIN in SQL?',
    options: [
      'INNER JOIN returns all rows from the left table regardless of a match',
      'LEFT JOIN returns only matching rows from both tables',
      'LEFT JOIN returns all rows from the left table, with NULLs for non-matching right table columns',
      'INNER JOIN includes NULLs for unmatched rows from both tables',
    ],
    correctIndex: 2,
    explanation: 'A LEFT JOIN returns all rows from the left table, and matching rows from the right table. If there is no match, the right side will contain NULL values.',
  },
  {
    id: 'q7',
    category: 'Data Structures',
    topic: 'Queue & Stack',
    difficulty: 'Easy',
    question: 'Which data structure is fundamentally used to implement Breadth-First Search (BFS) on a graph?',
    options: ['Stack', 'Queue', 'Min-Heap', 'Disjoint Set'],
    correctIndex: 1,
    explanation: 'BFS explores neighbors level-by-level using a FIFO (First-In, First-Out) Queue, whereas Depth-First Search (DFS) uses a LIFO Stack or recursion.',
  },
]

export function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTodayChallenge(): ChallengeQuestion {
  const today = new Date()
  // Day of year calculation for deterministic daily question
  const startOfYear = new Date(today.getFullYear(), 0, 0)
  const diff = today.getTime() - startOfYear.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  const index = Math.abs(dayOfYear) % QUESTION_BANK.length
  return QUESTION_BANK[index]
}

export function getStudentStreak(studentId: string): number {
  if (!studentId) return 1
  const streakKey = `forgr_streak_${studentId}`
  const lastLoginKey = `forgr_last_login_${studentId}`

  const storedStreak = parseInt(localStorage.getItem(streakKey) || '0', 10)
  const lastLogin = localStorage.getItem(lastLoginKey)
  const today = getTodayDateString()

  if (!lastLogin) {
    localStorage.setItem(streakKey, '1')
    localStorage.setItem(lastLoginKey, today)
    return 1
  }

  if (lastLogin === today) {
    return Math.max(1, storedStreak)
  }

  // Calculate day difference
  const lastDate = new Date(lastLogin)
  const todayDate = new Date(today)
  const diffTime = todayDate.getTime() - lastDate.getTime()
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24))

  if (diffDays === 1) {
    // Consecutive day login!
    const newStreak = storedStreak + 1
    localStorage.setItem(streakKey, String(newStreak))
    localStorage.setItem(lastLoginKey, today)
    return newStreak
  } else if (diffDays > 1) {
    // Streak broken, reset to 1
    localStorage.setItem(streakKey, '1')
    localStorage.setItem(lastLoginKey, today)
    return 1
  }

  return Math.max(1, storedStreak)
}

export function recordChallengeCompleted(studentId: string, questionId: string, isCorrect: boolean) {
  const today = getTodayDateString()
  const key = `forgr_challenge_${studentId}_${today}`
  localStorage.setItem(
    key,
    JSON.stringify({
      questionId,
      isCorrect,
      completedAt: new Date().toISOString(),
    }),
  )
}

export function isTodayChallengeCompleted(studentId: string): { isCompleted: boolean; isCorrect?: boolean } {
  const today = getTodayDateString()
  const key = `forgr_challenge_${studentId}_${today}`
  const data = localStorage.getItem(key)
  if (!data) return { isCompleted: false }
  try {
    const parsed = JSON.parse(data)
    return { isCompleted: true, isCorrect: parsed.isCorrect }
  } catch {
    return { isCompleted: true }
  }
}

export interface ScoreHistoryPoint {
  date: string
  score: number
}

export function getWeeklyChallengeActivity(studentId: string): boolean[] {
  const today = new Date()
  const dayOfWeek = today.getDay() || 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - dayOfWeek + 1)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return Boolean(localStorage.getItem(`forgr_challenge_${studentId}_${dateString}`))
  })
}

export function recordScoreSnapshot(studentId: string, score: number) {
  if (!studentId) return
  const key = `forgr_score_history_${studentId}`
  const today = getTodayDateString()
  const existing: ScoreHistoryPoint[] = JSON.parse(localStorage.getItem(key) || '[]')
  const next = [...existing.filter((point) => point.date !== today), { date: today, score }].slice(-14)
  localStorage.setItem(key, JSON.stringify(next))
}

export function getScoreHistory(studentId: string): ScoreHistoryPoint[] {
  if (!studentId) return []
  try {
    return JSON.parse(localStorage.getItem(`forgr_score_history_${studentId}`) || '[]') as ScoreHistoryPoint[]
  } catch {
    return []
  }
}

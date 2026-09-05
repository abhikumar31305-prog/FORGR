import { useState, useEffect } from 'react'
import {
  getTodayChallenge,
  getStudentStreak,
  isTodayChallengeCompleted,
  recordChallengeCompleted,
  type ChallengeQuestion,
} from '../../utils/dailyChallenge'

interface DailyChallengeCardProps {
  studentId: string
  onStreakUpdate?: (streak: number) => void
  onScoreBoost?: () => void
}

export function DailyChallengeCard({ studentId, onStreakUpdate, onScoreBoost }: DailyChallengeCardProps) {
  const [question, setQuestion] = useState<ChallengeQuestion | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [streak, setStreak] = useState(1)

  useEffect(() => {
    const q = getTodayChallenge()
    setQuestion(q)

    const currentStreak = getStudentStreak(studentId)
    setStreak(currentStreak)
    if (onStreakUpdate) onStreakUpdate(currentStreak)

    const status = isTodayChallengeCompleted(studentId)
    if (status.isCompleted) {
      setIsSubmitted(true)
      setIsCorrect(status.isCorrect ?? true)
      setSelectedOption(q.correctIndex)
    }
  }, [studentId, onStreakUpdate])

  if (!question) return null

  const handleSubmit = () => {
    if (selectedOption === null || isSubmitted) return
    const correct = selectedOption === question.correctIndex
    setIsSubmitted(true)
    setIsCorrect(correct)
    recordChallengeCompleted(studentId, question.id, correct)
    if (correct && onScoreBoost) {
      onScoreBoost()
    }
  }

  return (
    <div className="fg-card" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Accent strip */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, var(--ember) 0%, var(--amber) 50%, var(--patina) 100%)',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>3-Min Daily Tech Challenge</h3>
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 4,
              background: 'var(--steel-2)',
              border: '1px solid var(--line-soft)',
              color: 'var(--off-white)',
              fontWeight: 600,
            }}
          >
            {question.category} • {question.topic}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            borderRadius: 20,
            background: 'rgba(255, 90, 40, 0.12)',
            border: '1px solid var(--ember)',
            color: 'var(--ember)',
            fontSize: 12,
            fontWeight: 700,
          }}
          title="Days of continuous platform activity"
        >
          <span>🔥</span>
          <span>{streak} Day Streak</span>
        </div>
      </div>

      <div className="fg-cap" style={{ marginBottom: 14 }}>
        Solve one quick daily question to reinforce interview fundamentals and earn daily readiness points.
      </div>

      {/* Question prompt */}
      <div
        style={{
          background: 'var(--graphite)',
          padding: '14px 16px',
          borderRadius: 8,
          border: '1px solid var(--line)',
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--off-white)', lineHeight: 1.5 }}>
          {question.question}
        </div>
        {question.codeSnippet && (
          <pre
            style={{
              margin: '10px 0 0',
              padding: '8px 12px',
              borderRadius: 6,
              background: '#0B0D10',
              border: '1px solid var(--line)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              color: '#F59E0B',
              overflowX: 'auto',
            }}
          >
            <code>{question.codeSnippet}</code>
          </pre>
        )}
      </div>

      {/* Options */}
      <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
        {question.options.map((opt, idx) => {
          const isSelected = selectedOption === idx
          const isThisCorrect = isSubmitted && idx === question.correctIndex
          const isThisWrongSelected = isSubmitted && isSelected && !isCorrect

          let borderColor = 'var(--line)'
          let bgColor = 'var(--steel)'
          let textColor = 'var(--off-white)'

          if (isSubmitted) {
            if (isThisCorrect) {
              borderColor = 'var(--patina)'
              bgColor = 'rgba(95, 163, 127, 0.14)'
              textColor = 'var(--patina)'
            } else if (isThisWrongSelected) {
              borderColor = 'var(--ember)'
              bgColor = 'rgba(255, 90, 40, 0.14)'
              textColor = 'var(--ember)'
            }
          } else if (isSelected) {
            borderColor = 'var(--ember)'
            bgColor = 'var(--ember-wash)'
            textColor = 'var(--ember)'
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={isSubmitted}
              onClick={() => setSelectedOption(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 8,
                border: `1px solid ${borderColor}`,
                background: bgColor,
                color: textColor,
                fontSize: 13,
                textAlign: 'left',
                cursor: isSubmitted ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  border: `1.5px solid ${borderColor}`,
                  background: isSelected || isThisCorrect ? borderColor : 'transparent',
                  color: isSelected || isThisCorrect ? '#FFFFFF' : 'var(--grey)',
                  flexShrink: 0,
                }}
              >
                {String.fromCharCode(65 + idx)}
              </div>
              <div style={{ flex: 1 }}>{opt}</div>
              {isSubmitted && isThisCorrect && <span style={{ color: 'var(--patina)', fontWeight: 700 }}>✓ Correct</span>}
              {isSubmitted && isThisWrongSelected && <span style={{ color: 'var(--ember)', fontWeight: 700 }}>✕ Incorrect</span>}
            </button>
          )
        })}
      </div>

      {/* Explanation Banner */}
      {isSubmitted && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 8,
            background: isCorrect ? 'rgba(95, 163, 127, 0.1)' : 'rgba(255, 90, 40, 0.1)',
            border: `1px solid ${isCorrect ? 'var(--patina)' : 'var(--ember)'}`,
            marginBottom: 14,
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, color: isCorrect ? 'var(--patina)' : 'var(--ember)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{isCorrect ? '🎉 Great job!' : '💡 Learning Insight:'}</span>
            {isCorrect && (
              <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--patina)', color: '#FFFFFF' }}>
                +0.5% Readiness Boost
              </span>
            )}
          </div>
          <div style={{ color: 'var(--off-white)' }}>{question.explanation}</div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--grey)' }}>
          {isSubmitted ? (
            <span>✅ Completed for today! Check back tomorrow for the next challenge.</span>
          ) : (
            <span>Pick an option and submit to test your speed.</span>
          )}
        </div>

        {!isSubmitted && (
          <button
            type="button"
            disabled={selectedOption === null}
            onClick={handleSubmit}
            className="fg-btn-primary"
            style={{
              padding: '7px 18px',
              fontSize: 13,
              opacity: selectedOption === null ? 0.5 : 1,
              cursor: selectedOption === null ? 'not-allowed' : 'pointer',
            }}
          >
            Submit Answer
          </button>
        )}
      </div>
    </div>
  )
}

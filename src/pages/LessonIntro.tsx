import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Lesson } from '@/types/database'

export function LessonIntro() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!lessonId) return
    supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single()
      .then(({ data, error }) => {
        if (error) console.error(error)
        setLesson(data ?? null)
        setLoading(false)
      })
  }, [lessonId])

  if (loading) {
    return (
      <div
        className="animate-fade-in"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: 40 }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            background: 'var(--green-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            animation: 'float 2s ease-in-out infinite',
          }}
        >
          📖
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 600 }}>Carregando…</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--green)',
                animation: 'dotPulse 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </div>
      </div>
    )
  }
  if (!lesson) {
    return (
      <div className="card animate-scale-in animate-once" style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, color: 'var(--error)', fontWeight: 600 }}>Aula não encontrada.</p>
      </div>
    )
  }

  const goals = Array.isArray(lesson.learning_goals) ? lesson.learning_goals : []

  return (
    <div className="animate-fade-in">
      <div
        className="card animate-scale-in animate-once"
        style={{ marginBottom: 20, animationDelay: '0.08s' }}
      >
        <h2
          className="animate-fade-in-up animate-once"
          style={{
            margin: '0 0 20px',
            fontSize: '1.375rem',
            fontWeight: 800,
            color: 'var(--text-strong)',
            opacity: 0,
            animationDelay: '0.15s',
          }}
        >
          {lesson.title}
        </h2>

        {goals.length > 0 && (
          <section
            className="animate-fade-in-up animate-once"
            style={{ marginBottom: 24, opacity: 0, animationDelay: '0.2s' }}
          >
            <h3
              style={{
                margin: '0 0 12px',
                fontSize: '0.9375rem',
                fontWeight: 800,
                color: 'var(--green-dark)',
              }}
            >
              You will learn
            </h3>
            <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text)', lineHeight: 1.7 }}>
              {goals.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </section>
        )}

        <section
          className="animate-fade-in-up animate-once"
          style={{ marginBottom: 24, opacity: 0, animationDelay: '0.25s' }}
        >
          <h3
            style={{
              margin: '0 0 12px',
              fontSize: '0.9375rem',
              fontWeight: 800,
              color: 'var(--green-dark)',
            }}
          >
            Context
          </h3>
          <p style={{ margin: 0, color: 'var(--text)', lineHeight: 1.6 }}>{lesson.context}</p>
        </section>

        <Link
          to={`/lesson/${lessonId}/chat`}
          className="btn-primary animate-fade-in-up animate-once"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            marginTop: 8,
            opacity: 0,
            animationDelay: '0.35s',
          }}
        >
          <span>Start conversation</span>
          <span style={{ fontSize: '1.25rem' }}>→</span>
        </Link>
      </div>
    </div>
  )
}

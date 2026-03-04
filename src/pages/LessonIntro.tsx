import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Lesson } from '@/types/database'
import { BookOpen, Target, ArrowRight, CheckCircle2, MessageSquare, ArrowLeft } from 'lucide-react'


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
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: 48 }}
      >
        <div
          className="icon-wrap"
          style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            background: 'var(--green-soft)',
            color: 'var(--green)',
            animation: 'float 2s ease-in-out infinite',
          }}
        >
          <BookOpen size={26} strokeWidth={1.75} />
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 500, fontSize: 14 }}>Carregando</p>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--green)',
                opacity: 0.6,
                animation: 'dotPulse 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.12}s`,
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
        <p style={{ margin: 0, color: 'var(--error)', fontWeight: 500, fontSize: 14 }}>Aula não encontrada.</p>
      </div>
    )
  }

  const goals = Array.isArray(lesson.learning_goals) ? lesson.learning_goals : []

  return (
    <div className="animate-fade-in">
      <div className="animate-scale-in animate-once" style={{ animationDelay: '0.06s' }}>
        <Link to="/" className="link-back" style={{ display: 'inline-flex', marginBottom: 16 }}>
          <ArrowLeft size={18} strokeWidth={2} />
          Voltar à trilha
        </Link>
        {/* Título em destaque */}
        <div
          className="animate-fade-in-up animate-once"
          style={{
            background: 'linear-gradient(135deg, var(--green-soft) 0%, rgba(88, 204, 2, 0.05) 100%)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px 20px',
            marginBottom: 24,
            borderLeft: '4px solid var(--green)',
            opacity: 0,
            animationDelay: '0.1s',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--text-strong)',
              lineHeight: 1.3,
            }}
          >
            {lesson.title}
          </h2>
        </div>

        {goals.length > 0 && (
          <section
            className="animate-fade-in-up animate-once"
            style={{ marginBottom: 24, opacity: 0, animationDelay: '0.16s' }}
          >
            <h3
              style={{
                margin: '0 0 14px',
                fontSize: 14,
                fontWeight: 800,
                color: 'var(--green-dark)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <Target size={18} strokeWidth={2.5} />
              You will learn
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {goals.map((g, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius)',
                    border: '2px solid var(--border)',
                    boxShadow: 'var(--shadow)',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--green)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(88, 204, 2, 0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.boxShadow = 'var(--shadow)'
                  }}
                >
                  <div
                    className="icon-wrap"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'var(--green-soft)',
                      color: 'var(--green)',
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle2 size={20} strokeWidth={2} />
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--text-strong)', fontSize: 15 }}>{g}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section
          className="animate-fade-in-up animate-once"
          style={{ marginBottom: 28, opacity: 0, animationDelay: '0.24s' }}
        >
          <h3
            style={{
              margin: '0 0 14px',
              fontSize: 14,
              fontWeight: 800,
              color: 'var(--green-dark)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <MessageSquare size={18} strokeWidth={2.5} />
            Context
          </h3>
          <div
            style={{
              padding: '20px 20px',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius)',
              border: '2px solid var(--border)',
              position: 'relative',
            }}
          >
            <p
              style={{
                margin: 0,
                color: 'var(--text)',
                lineHeight: 1.7,
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              {lesson.context}
            </p>
          </div>
        </section>

        <Link
          to={`/lesson/${lessonId}/chat`}
          className="btn-primary animate-fade-in-up animate-once"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            opacity: 0,
            animationDelay: '0.32s',
          }}
        >
          Start conversation
          <ArrowRight size={20} strokeWidth={2} />
        </Link>
      </div>
    </div>
  )
}

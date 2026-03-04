import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { LevelWithModules } from '@/types/database'
import { BookOpen, MessageCircle, ChevronRight } from 'lucide-react'

export function LearningPath() {
  const [levels, setLevels] = useState<LevelWithModules[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: levelsData, error: levelsErr } = await supabase
        .from('levels')
        .select('*')
        .order('order')
      if (levelsErr) {
        console.error(levelsErr)
        setLoading(false)
        return
      }
      if (!levelsData?.length) {
        setLoading(false)
        return
      }
      const { data: modulesData, error: modulesErr } = await supabase
        .from('modules')
        .select('*')
        .order('order')
      if (modulesErr) {
        console.error(modulesErr)
        setLoading(false)
        return
      }
      const { data: lessonsData, error: lessonsErr } = await supabase
        .from('lessons')
        .select('*')
        .order('order')
      if (lessonsErr) {
        console.error(lessonsErr)
        setLoading(false)
        return
      }
      const withModules: LevelWithModules[] = (levelsData as LevelWithModules[]).map((l) => ({
        ...l,
        modules: (modulesData ?? [])
          .filter((m) => m.level_id === l.id)
          .sort((a, b) => a.order - b.order)
          .map((m) => ({
            ...m,
            lessons: (lessonsData ?? []).filter((le) => le.module_id === m.id).sort((a, b) => a.order - b.order),
          })),
      }))
      setLevels(withModules)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div
        className="animate-fade-in"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: 48 }}
      >
        <div
          className="icon-wrap"
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: 'var(--green-soft)',
            color: 'var(--green)',
            animation: 'float 2s ease-in-out infinite',
          }}
        >
          <BookOpen size={32} strokeWidth={1.75} />
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 500, fontSize: 14 }}>
          Carregando trilha
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 340 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton" style={{ height: 52, borderRadius: 'var(--radius)' }} />
          ))}
        </div>
      </div>
    )
  }

  if (!levels.length) {
    return (
      <div className="card animate-scale-in animate-once" style={{ textAlign: 'center', padding: 32 }}>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 500, fontSize: 14 }}>
          Nenhum nível cadastrado. Execute o seed do Supabase.
        </p>
      </div>
    )
  }

  let staggerIndex = 0
  return (
    <div className="animate-fade-in">
      <div className="animate-fade-in-up animate-once" style={{ marginBottom: 28 }}>
        <h2
          style={{
            margin: '0 0 6px',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--text-strong)',
          }}
        >
          Trilha de aprendizado
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
          Escolha uma aula e pratique com o professor IA.
        </p>
      </div>

      {levels.map((level, levelIdx) => {
        const sectionStagger = staggerIndex++
        return (
          <section
            key={level.id}
            className="animate-fade-in-up animate-once"
            style={{
              marginBottom: 32,
              opacity: 0,
              animationDelay: `${0.08 + sectionStagger * 0.05}s`,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 18px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--green-soft)',
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 10,
                  background: 'var(--green)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 800,
                  boxShadow: '0 2px 0 var(--green-dark)',
                }}
              >
                {levelIdx + 1}
              </span>
              <span style={{ fontWeight: 800, color: 'var(--green-dark)', fontSize: 15 }}>
                {level.code} — {level.name}
              </span>
            </div>

            {level.modules.map((mod) => (
              <div key={mod.id} style={{ marginBottom: 20 }}>
                <h3
                  style={{
                    margin: '0 0 10px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {mod.title}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {mod.lessons.map((lesson, lessonIdx) => {
                    const delay = 0.12 + sectionStagger * 0.05 + lessonIdx * 0.03
                    return (
                      <Link
                        key={lesson.id}
                        to={`/lesson/${lesson.id}`}
                        className="animate-fade-in-up animate-once lesson-card"
                        style={{
                          opacity: 0,
                          animationDelay: `${delay}s`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '16px 18px',
                          background: 'var(--surface)',
                          border: '2px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          textDecoration: 'none',
                          color: 'var(--text-strong)',
                          fontWeight: 700,
                          boxShadow: 'var(--shadow)',
                        }}
                      >
                        <div
                          className="icon-wrap"
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: 'var(--green-soft)',
                            color: 'var(--green-dark)',
                          }}
                        >
                          <MessageCircle size={20} strokeWidth={1.75} />
                        </div>
                        <span style={{ flex: 1, fontSize: 15 }}>{lesson.title}</span>
                        <ChevronRight size={22} style={{ color: 'var(--green)' }} />
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}

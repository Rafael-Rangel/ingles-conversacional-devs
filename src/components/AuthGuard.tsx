import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { BookOpen } from 'lucide-react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<{ user: { id: string } } | null>(null)
  const location = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div
        className="animate-fade-in"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          padding: 24,
          background: 'var(--bg)',
        }}
      >
        <div
          className="icon-wrap"
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: 'var(--green)',
            color: 'white',
            boxShadow: '0 6px 0 var(--green-dark)',
            animation: 'float 2s ease-in-out infinite',
          }}
        >
          <BookOpen size={36} strokeWidth={1.75} />
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 500, fontSize: 14 }}>
          Carregando
        </p>
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

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

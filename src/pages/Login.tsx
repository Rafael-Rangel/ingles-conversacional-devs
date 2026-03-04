import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'
  const [showPassword, setShowPassword] = useState(false)

  function friendlyError(msg: string): string {
    if (msg.toLowerCase().includes('invalid login')) return 'Email ou senha incorretos.'
    if (msg.toLowerCase().includes('rate limit')) return 'Muitas tentativas. Tente novamente em alguns segundos.'
    return msg
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      setError(friendlyError(err.message))
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div
      className="animate-fade-in"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--bg)',
      }}
    >
      <div
        className="card animate-scale-in animate-once"
        style={{ maxWidth: 400, width: '100%', animationDelay: '0.08s' }}
      >
        <div
          className="animate-fade-in-up animate-once"
          style={{ textAlign: 'center', marginBottom: 28, animationDelay: '0.12s' }}
        >
          <div
            className="icon-wrap"
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'var(--green)',
              color: 'white',
              margin: '0 auto 20px',
              boxShadow: '0 6px 0 var(--green-dark)',
              animation: 'scaleIn 0.5s var(--ease-out-back) 0.1s both',
            }}
          >
            <LogIn size={36} strokeWidth={1.75} />
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--text-strong)',
            }}
          >
            Entrar
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Use seu email e senha para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="animate-fade-in-up animate-once stagger-1" style={{ opacity: 0 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={18}
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
              />
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                required
                autoComplete="email"
                style={{ paddingLeft: 42 }}
              />
            </div>
          </div>
          <div className="animate-fade-in-up animate-once stagger-2" style={{ opacity: 0 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
                autoComplete="current-password"
                style={{ paddingLeft: 42, paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: 4,
                  border: 'none',
                  background: 'none',
                  color: 'var(--text-subtle)',
                  cursor: 'pointer',
                }}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && (
            <p
              role="alert"
              className="animate-fade-in-up"
              style={{
                margin: 0,
                padding: 12,
                background: 'var(--error-soft)',
                color: 'var(--error)',
                fontSize: 13,
                borderRadius: 'var(--radius-sm)',
                fontWeight: 500,
              }}
            >
              {error}
            </p>
          )}
          <div className="animate-fade-in-up animate-once stagger-3" style={{ opacity: 0, marginTop: 4 }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
              <LogIn size={18} />
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </div>
        </form>

        <p
          className="animate-fade-in-up animate-once stagger-4"
          style={{
            margin: '24px 0 0',
            textAlign: 'center',
            fontSize: 14,
            color: 'var(--text-muted)',
            opacity: 0,
          }}
        >
          Ainda não tem conta?{' '}
          <Link to="/signup" style={{ color: 'var(--green)', fontWeight: 800 }}>
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

function friendlyError(msg: string): string {
  if (msg.toLowerCase().includes('already registered')) return 'Este email já está cadastrado. Faça login.'
  if (msg.toLowerCase().includes('rate limit')) return 'Muitas tentativas. Tente de novo em alguns segundos.'
  return msg
}

export function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { data, error: err } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (err) {
      setError(friendlyError(err.message))
      return
    }
    if (data.session) {
      navigate('/', { replace: true })
      return
    }
    setSuccess(true)
  }

  if (success) {
    return (
      <div
        className="animate-fade-in"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'linear-gradient(180deg, var(--bg-subtle) 0%, var(--bg) 30%)',
        }}
      >
        <div
          className="card animate-scale-in animate-once"
          style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'var(--green)',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              boxShadow: '0 4px 0 var(--green-dark)',
              animation: 'scaleIn 0.5s var(--ease-out-back) both',
            }}
          >
            ✓
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-strong)' }}>
            Conta criada!
          </h1>
          <p style={{ margin: '8px 0 20px', color: 'var(--text-muted)', fontSize: 15 }}>
            Verifique seu email para confirmar (se a confirmação estiver ativa). Ou faça login agora.
          </p>
          <button type="button" className="btn-primary" onClick={() => navigate('/login', { replace: true })}>
            Ir para login
          </button>
        </div>
      </div>
    )
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
        background: 'linear-gradient(180deg, var(--bg-subtle) 0%, var(--bg) 30%)',
      }}
    >
      <div
        className="card animate-scale-in animate-once"
        style={{ maxWidth: 400, width: '100%', animationDelay: '0.1s' }}
      >
        <div
          className="animate-fade-in-up animate-once"
          style={{ textAlign: 'center', marginBottom: 24, animationDelay: '0.15s' }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'var(--green)',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              boxShadow: '0 4px 0 var(--green-dark)',
              animation: 'scaleIn 0.5s var(--ease-out-back) 0.2s both',
            }}
          >
            🚀
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-strong)' }}>
            Criar conta
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 15 }}>
            Digite seu email e uma senha (mínimo 6 caracteres).
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="animate-fade-in-up animate-once stagger-1" style={{ opacity: 0 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
              autoComplete="email"
            />
          </div>
          <div className="animate-fade-in-up animate-once stagger-2" style={{ opacity: 0 }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha (mín. 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                marginTop: 8,
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--green)' }}
              />
              Mostrar senha
            </label>
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
                fontSize: 14,
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
              }}
            >
              {error}
            </p>
          )}
          <div className="animate-fade-in-up animate-once stagger-3" style={{ opacity: 0, marginTop: 8 }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Criando…' : 'Criar conta'}
            </button>
          </div>
        </form>

        <p
          className="animate-fade-in-up animate-once stagger-4"
          style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 15, color: 'var(--text-muted)', opacity: 0 }}
        >
          Já tem conta?{' '}
          <Link to="/login" style={{ color: 'var(--green)', fontWeight: 800 }}>
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}

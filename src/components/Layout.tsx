import { Outlet } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export function Layout() {
  return (
    <div
      className="animate-fade-in"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 480,
        margin: '0 auto',
        background: 'var(--bg)',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          animation: 'fadeInDown 0.45s var(--ease-out-expo) both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: 'var(--green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              boxShadow: '0 2px 0 var(--green-dark)',
              transition: 'transform 0.2s var(--ease-spring)',
            }}
            aria-hidden
          >
            📚
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--text-strong)',
            }}
          >
            Inglês para Devs
          </h1>
        </div>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '8px 14px', fontSize: 14 }}
          onClick={() => supabase.auth.signOut()}
        >
          Sair
        </button>
      </header>
      <main style={{ flex: 1, padding: '20px' }}>
        <Outlet />
      </main>
    </div>
  )
}

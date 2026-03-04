import { Outlet, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { BookOpen, LogOut } from 'lucide-react'

export function Layout() {
  return (
    <div
      className="animate-fade-in"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 520,
        margin: '0 auto',
        background: 'var(--bg)',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          animation: 'fadeInDown 0.4s var(--ease-out-expo) both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            className="icon-wrap"
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'var(--green)',
              color: 'white',
              boxShadow: '0 4px 0 var(--green-dark)',
            }}
          >
            <BookOpen size={24} strokeWidth={2} />
          </div>
          <Link
            to="/"
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--text-strong)',
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--green)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-strong)' }}
          >
            Inglês para Devs
          </Link>
        </div>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '8px 12px', fontSize: 13 }}
          onClick={() => supabase.auth.signOut()}
        >
          <LogOut size={16} />
          Sair
        </button>
      </header>
      <main style={{ flex: 1, padding: '24px' }}>
        <Outlet />
      </main>
    </div>
  )
}

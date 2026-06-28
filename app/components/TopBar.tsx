'use client'
import { useRef, useEffect, useState } from 'react'
import type { Profile } from '@/types'
import type { Session } from '@supabase/supabase-js'

interface Props {
  query: string
  onQuery: (q: string) => void
  profile: Profile | null
  session: Session | null
  isAdmin: boolean
  onAdd: () => void
  onAdmin: () => void
  onSignOut: () => void
  onAuthClick: () => void
}

export default function TopBar({ query, onQuery, profile, session, isAdmin, onAdd, onAdmin, onSignOut, onAuthClick }: Props) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const initials = profile?.display_name?.slice(0, 2).toUpperCase()
    ?? session?.user?.email?.slice(0, 2).toUpperCase()
    ?? null

  return (
    <header style={{
      height: 60, background: '#fff', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 18px', gap: 14,
      flexShrink: 0, position: 'relative', zIndex: 200,
      boxShadow: '0 1px 0 var(--border)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg,#B8860B,#8B6914)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, color: '#fff',
        }}>✡</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.3px', lineHeight: 1.2 }}>Kosher Map</div>
          <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase' }}>Annuaire certifié</div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div style={{ flex: 1, maxWidth: 500, position: 'relative' }}>
        <i className="ti ti-search" style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text3)', fontSize: 16, pointerEvents: 'none',
        }} />
        <input
          type="search"
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder="Restaurant, boucherie, ville…"
          style={{
            width: '100%', height: 38, background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 22, padding: '0 14px 0 38px', fontSize: 13.5,
            fontFamily: 'var(--font)', color: 'var(--text)', outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        {/* Proposer un lieu */}
        <button onClick={onAdd} style={{
          height: 36, padding: '0 14px', border: '1px solid var(--border)',
          background: '#fff', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
          color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--font)', transition: 'all .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = 'var(--text2)' }}
        >
          <i className="ti ti-plus" style={{ fontSize: 15 }} />
          Proposer
        </button>

        {/* Admin */}
        {isAdmin && (
          <button onClick={onAdmin} style={{
            height: 36, padding: '0 14px', border: '1px solid rgba(184,134,11,.3)',
            background: 'var(--gold-bg)', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
            color: 'var(--gold)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font)',
          }}>
            <i className="ti ti-shield" style={{ fontSize: 14 }} />
            Admin
          </button>
        )}

        {/* Avatar / connexion */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          {menu && (
            <div
              onClick={() => setMenu(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
            />
          )}
          <div
            onClick={() => session ? setMenu(m => !m) : onAuthClick()}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: session ? 'linear-gradient(135deg,#B8860B,#8B6914)' : 'var(--bg)',
              border: session ? 'none' : '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: session ? '#fff' : 'var(--text3)',
              cursor: 'pointer',
            }}
          >
            {initials ?? <i className="ti ti-user" />}
          </div>

          {menu && session && (
            <div style={{
              position: 'fixed', top: 60, right: 18, background: '#fff',
              border: '1px solid var(--border)', borderRadius: 12,
              boxShadow: '0 8px 30px rgba(0,0,0,.12)', minWidth: 200, zIndex: 99999, overflow: 'hidden',
            }}>
              <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{profile?.display_name || 'Membre'}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2 }}>{session.user.email}</div>
              </div>
              <a
                href="/premium"
                onClick={() => setMenu(false)}
                style={{
                  padding: '10px 14px', fontSize: 13, color: 'var(--gold)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  textDecoration: 'none', borderBottom: '1px solid var(--border)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <svg width="13" height="12" viewBox="0 0 11 10" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M1 8.5L2.2 3.2L4.8 6L5.5 1.5L6.2 6L8.8 3.2L10 8.5H1Z" fill="currentColor" stroke="currentColor" strokeWidth=".4" strokeLinejoin="round"/>
                </svg>
                Passer en Premium
              </a>
              <div
                onClick={() => { onSignOut(); setMenu(false) }}
                style={{
                  padding: '10px 14px', fontSize: 13, color: 'var(--text2)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'background .1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <i className="ti ti-logout" style={{ fontSize: 15 }} />
                Se déconnecter
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

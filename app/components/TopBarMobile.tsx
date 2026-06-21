'use client'
import { useState, useRef, useEffect } from 'react'
import type { Profile } from '@/types'
import type { Session } from '@supabase/supabase-js'

interface Props {
  query: string
  onQuery: (q: string) => void
  profile: Profile | null
  session: Session | null
  isAdmin: boolean
  onAdmin: () => void
  onSignOut: () => void
  onAuthClick: () => void
}

export default function TopBarMobile({ query, onQuery, profile, session, isAdmin, onAdmin, onSignOut, onAuthClick }: Props) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fn = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('pointerdown', fn)
    return () => document.removeEventListener('pointerdown', fn)
  }, [])

  const initials = profile?.display_name?.slice(0, 2).toUpperCase()
    ?? session?.user?.email?.slice(0, 2).toUpperCase() ?? null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 700,
      padding: 'max(10px, env(safe-area-inset-top)) 12px 0',
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{
          flex: 1, height: 46, background: '#fff', borderRadius: 24,
          boxShadow: '0 2px 14px rgba(0,0,0,.14)', display: 'flex', alignItems: 'center',
          padding: '0 16px', gap: 9,
        }}>
          <i className="ti ti-search" style={{ color: 'var(--text3)', fontSize: 18, flexShrink: 0 }} />
          <input
            type="search"
            value={query}
            onChange={e => onQuery(e.target.value)}
            placeholder="Rechercher un lieu casher…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14.5, fontFamily: 'var(--font)', color: 'var(--text)', minWidth: 0,
            }}
          />
        </div>

        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <div
            onClick={() => session ? setMenu(m => !m) : onAuthClick()}
            style={{
              width: 46, height: 46, borderRadius: '50%',
              background: session ? 'linear-gradient(135deg,#B8860B,#8B6914)' : '#fff',
              border: session ? 'none' : '1px solid var(--border)',
              boxShadow: '0 2px 14px rgba(0,0,0,.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: session ? '#fff' : 'var(--text3)',
            }}
          >
            {initials ?? <i className="ti ti-user" />}
          </div>

          {menu && session && (
            <div style={{
              position: 'absolute', top: 54, right: 0, background: '#fff',
              border: '1px solid var(--border)', borderRadius: 12,
              boxShadow: 'var(--shadow-lg)', minWidth: 200, zIndex: 9999, overflow: 'hidden',
            }}>
              <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{profile?.display_name || 'Membre'}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2 }}>{session.user.email}</div>
              </div>
              {isAdmin && (
                <div onClick={() => { onAdmin(); setMenu(false) }} style={rowStyle}>
                  <i className="ti ti-shield" style={{ fontSize: 15, color: 'var(--gold)' }} /> Administration
                </div>
              )}
              <div onClick={() => { onSignOut(); setMenu(false) }} style={rowStyle}>
                <i className="ti ti-logout" style={{ fontSize: 15 }} /> Se déconnecter
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const rowStyle: React.CSSProperties = {
  padding: '11px 14px', fontSize: 13, color: 'var(--text2)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
}

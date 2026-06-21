'use client'
import { useState, useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string, name: string) => Promise<any>
  onSuccess: () => void
}

export default function AuthModal({ open, onClose, onSignIn, onSignUp, onSuccess }: Props) {
  const [mode, setMode]       = useState<'signin' | 'signup'>('signin')
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [name, setName]       = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) { setError(''); setEmail(''); setPass(''); setName('') }
  }, [open])

  async function submit() {
    setError('')
    if (!email || !pass) { setError('Email et mot de passe requis.'); return }
    if (mode === 'signup' && pass.length < 6) { setError('Mot de passe trop court (min. 6 caractères).'); return }
    setLoading(true)
    try {
      if (mode === 'signin') {
        await onSignIn(email, pass)
        onSuccess()
        onClose()
      } else {
        const s = await onSignUp(email, pass, name)
        if (!s) { setError('Vérifiez vos emails pour confirmer votre compte.'); setMode('signin') }
        else { onSuccess(); onClose() }
      }
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null
  return (
    <Backdrop onClose={onClose}>
      <div className="fade-up" style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 380,
        boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
        border: '1px solid var(--border)',
      }}>
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {mode === 'signin' ? 'Se connecter' : 'Créer un compte'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)' }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div style={{ padding: '18px 22px 22px' }}>
          {/* Tab */}
          <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 8, padding: 3, marginBottom: 18, gap: 3 }}>
            {(['signin', 'signup'] as const).map(m => (
              <div key={m} onClick={() => { setMode(m); setError('') }} style={{
                flex: 1, textAlign: 'center', padding: '7px 0', borderRadius: 6,
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                color: mode === m ? 'var(--gold)' : 'var(--text3)',
                background: mode === m ? '#fff' : 'transparent',
                boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
              }}>
                {m === 'signin' ? 'Connexion' : 'Inscription'}
              </div>
            ))}
          </div>

          {error && (
            <div style={{ fontSize: 12.5, color: 'var(--red)', marginBottom: 14, padding: '8px 10px', background: 'rgba(224,54,59,.06)', borderRadius: 7, lineHeight: 1.4 }}>
              {error}
            </div>
          )}

          {mode === 'signup' && (
            <Field label="Prénom / Pseudo">
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="David" style={inp} />
            </Field>
          )}
          <Field label="Email">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" style={inp} />
          </Field>
          <Field label="Mot de passe">
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" style={inp}
              onKeyDown={e => e.key === 'Enter' && submit()} />
          </Field>

          <button onClick={submit} disabled={loading} style={{
            width: '100%', height: 40, background: loading ? 'rgba(184,134,11,.5)' : 'var(--gold)',
            border: 'none', borderRadius: 8, color: '#fff', fontSize: 13.5, fontWeight: 600,
            cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 7, fontFamily: 'var(--font)', marginTop: 4,
            transition: 'background .15s',
          }}>
            {loading
              ? <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Chargement…</>
              : mode === 'signin' ? <><i className="ti ti-login-2" /> Se connecter</> : <><i className="ti ti-user-plus" /> Créer mon compte</>
            }
          </button>
        </div>
      </div>
    </Backdrop>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', backdropFilter: 'blur(6px)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      {children}
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', height: 40, background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '0 12px', fontSize: 13.5, fontFamily: 'var(--font)',
  color: 'var(--text)', outline: 'none',
}

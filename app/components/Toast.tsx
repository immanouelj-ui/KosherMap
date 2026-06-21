'use client'
import { useState, useEffect, useCallback } from 'react'

interface ToastItem { id: number; title: string; msg: string; icon: string; color: string }
let _add: ((t: Omit<ToastItem, 'id'>) => void) | null = null

export function toast(title: string, msg: string, type: 'success' | 'error' | 'info' = 'info') {
  const map = { success: { icon: 'ti-circle-check', color: 'var(--green)' }, error: { icon: 'ti-alert-circle', color: 'var(--red)' }, info: { icon: 'ti-info-circle', color: 'var(--gold)' } }
  _add?.({ title, msg, ...map[type] })
}

export function Toast() {
  const [items, setItems] = useState<ToastItem[]>([])
  let next = 0

  const add = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = ++next
    setItems(p => [...p, { ...t, id }])
    setTimeout(() => setItems(p => p.filter(x => x.id !== id)), 3500)
  }, [])

  useEffect(() => { _add = add; return () => { _add = null } }, [add])

  if (!items.length) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
      {items.map(t => (
        <div key={t.id} className="toast" style={{ borderLeft: `3px solid ${t.color}` }}>
          <i className={`ti ${t.icon}`} style={{ fontSize: 18, color: t.color, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>
            {t.msg && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{t.msg}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

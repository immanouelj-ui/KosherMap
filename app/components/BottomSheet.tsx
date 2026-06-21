'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

interface Props {
  children: React.ReactNode
  snapPoints: number[]   // % de hauteur d'écran, ex [14, 50, 92]
  initial: number        // index de départ dans snapPoints
  onSnapChange: (index: number) => void
}

export default function BottomSheet({ children, snapPoints, initial, onSnapChange }: Props) {
  const [index, setIndex] = useState(initial)
  const [dragOffsetPx, setDragOffsetPx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [vh, setVh] = useState(800) // valeur par défaut identique SSR/premier rendu client
  const startY = useRef<number | null>(null)
  const startHeightPx = useRef(0)

  useEffect(() => {
    setMounted(true)
    const update = () => setVh(window.innerHeight)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const heightPct = snapPoints[index] ?? snapPoints[0]
  const targetPx = (heightPct / 100) * vh

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startY.current = e.clientY
    startHeightPx.current = targetPx
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [targetPx])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (startY.current == null) return
    setDragOffsetPx(startY.current - e.clientY)
  }, [])

  const onPointerUp = useCallback(() => {
    if (startY.current == null) return
    const finalPx = startHeightPx.current + dragOffsetPx
    const finalPct = (finalPx / vh) * 100

    // Trouve le snap point le plus proche
    let bestIdx = 0
    let bestDist = Infinity
    snapPoints.forEach((p, i) => {
      const d = Math.abs(p - finalPct)
      if (d < bestDist) { bestDist = d; bestIdx = i }
    })

    setIndex(bestIdx)
    onSnapChange(bestIdx)
    startY.current = null
    setDragOffsetPx(0)
    setDragging(false)
  }, [dragOffsetPx, vh, snapPoints, onSnapChange])

  const currentPx = Math.min(vh * 0.96, Math.max(vh * 0.08, targetPx + (dragging ? dragOffsetPx : 0)))

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 600,
      height: mounted ? currentPx : `${heightPct}vh`,
      background: '#fff',
      borderRadius: '18px 18px 0 0',
      boxShadow: '0 -4px 24px rgba(0,0,0,.14)',
      display: 'flex', flexDirection: 'column',
      transition: dragging ? 'none' : 'height .28s cubic-bezier(.32,.72,0,1)',
    }}>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ padding: '10px 0 8px', display: 'flex', justifyContent: 'center', cursor: 'grab', flexShrink: 0, touchAction: 'none' }}
      >
        <div style={{ width: 36, height: 4.5, borderRadius: 3, background: 'rgba(0,0,0,.15)' }} />
      </div>

      <div style={{ flex: 1, overflowY: heightPct <= snapPoints[0] ? 'hidden' : 'auto', WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>
    </div>
  )
}

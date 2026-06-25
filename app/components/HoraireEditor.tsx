'use client'
import { useState } from 'react'

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export type DaySlot = { open_time: string; close_time: string }
export type DaySchedule = { is_closed: boolean; slots: DaySlot[] }
export type WeekSchedule = DaySchedule[] // index 0 = dimanche … 6 = samedi

export function emptyWeek(): WeekSchedule {
  return DAYS.map(() => ({ is_closed: false, slots: [{ open_time: '', close_time: '' }] }))
}

/** Convertit les rows opening_hours Supabase → WeekSchedule */
export function rowsToWeek(rows: any[]): WeekSchedule {
  const week = emptyWeek()
  for (const r of rows) {
    const i = r.day_of_week
    if (i < 0 || i > 6) continue
    if (r.is_closed) { week[i].is_closed = true; week[i].slots = [{ open_time: '', close_time: '' }]; continue }
    if (!r.open_time) continue
    const slot: DaySlot = { open_time: r.open_time.slice(0, 5), close_time: r.close_time?.slice(0, 5) || '' }
    if (r.slot === 0) week[i].slots[0] = slot
    else week[i].slots[1] = slot
  }
  return week
}

/** Convertit WeekSchedule → rows à insérer dans opening_hours */
export function weekToRows(placeId: string, week: WeekSchedule) {
  const rows: any[] = []
  week.forEach((day, i) => {
    if (day.is_closed) {
      rows.push({ place_id: placeId, day_of_week: i, is_closed: true, open_time: null, close_time: null, slot: 0 })
    } else {
      day.slots.forEach((s, slot) => {
        if (s.open_time) rows.push({ place_id: placeId, day_of_week: i, is_closed: false, open_time: s.open_time, close_time: s.close_time || null, slot })
      })
    }
  })
  return rows
}

interface Props {
  value: WeekSchedule
  onChange: (w: WeekSchedule) => void
}

export default function HoraireEditor({ value, onChange }: Props) {
  function setDay(i: number, day: Partial<DaySchedule>) {
    const next = value.map((d, j) => j === i ? { ...d, ...day } : d)
    onChange(next)
  }

  function setSlot(i: number, slot: number, field: keyof DaySlot, v: string) {
    const next = value.map((d, j) => {
      if (j !== i) return d
      const slots = [...d.slots]
      slots[slot] = { ...slots[slot], [field]: v }
      return { ...d, slots }
    })
    onChange(next)
  }

  function addSlot(i: number) {
    const next = value.map((d, j) => j === i ? { ...d, slots: [...d.slots, { open_time: '', close_time: '' }] } : d)
    onChange(next)
  }

  function removeSlot(i: number) {
    const next = value.map((d, j) => j === i ? { ...d, slots: d.slots.slice(0, 1) } : d)
    onChange(next)
  }

  return (
    <div>
      {DAYS.map((day, i) => {
        const d = value[i]
        return (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '90px 1fr', gap: 12, alignItems: 'flex-start',
            padding: '10px 0', borderBottom: i < 6 ? '1px solid var(--border)' : 'none',
          }}>
            {/* Jour + toggle */}
            <div style={{ paddingTop: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{day}</div>
              <div
                onClick={() => setDay(i, { is_closed: !d.is_closed })}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  color: d.is_closed ? 'var(--red)' : 'var(--green)',
                  background: d.is_closed ? 'rgba(224,54,59,.08)' : 'rgba(31,164,82,.08)',
                  border: `1px solid ${d.is_closed ? 'rgba(224,54,59,.25)' : 'rgba(31,164,82,.25)'}`,
                  padding: '3px 8px', borderRadius: 8, userSelect: 'none',
                }}
              >
                <span style={{ fontSize: 8 }}>●</span>
                {d.is_closed ? 'Fermé' : 'Ouvert'}
              </div>
            </div>

            {/* Créneaux */}
            <div>
              {d.is_closed ? (
                <div style={{ paddingTop: 8, fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>Fermé ce jour</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {d.slots.map((s, slot) => (
                    <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="time" value={s.open_time}
                        onChange={e => setSlot(i, slot, 'open_time', e.target.value)}
                        style={timeInp}
                      />
                      <span style={{ color: 'var(--text3)', fontSize: 13 }}>–</span>
                      <input
                        type="time" value={s.close_time}
                        onChange={e => setSlot(i, slot, 'close_time', e.target.value)}
                        style={timeInp}
                      />
                      {slot > 0 && (
                        <button onClick={() => removeSlot(i)} style={iconBtn}>
                          <i className="ti ti-x" />
                        </button>
                      )}
                    </div>
                  ))}
                  {d.slots.length < 2 && (
                    <button onClick={() => addSlot(i)} style={{ ...iconBtn, width: 'auto', padding: '0 10px', fontSize: 11, gap: 4, color: 'var(--gold)', borderColor: 'rgba(184,134,11,.3)' }}>
                      <i className="ti ti-plus" /> Ajouter un créneau
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const timeInp: React.CSSProperties = {
  height: 34, border: '1px solid var(--border)', borderRadius: 7,
  padding: '0 8px', fontSize: 13, fontFamily: 'var(--font)', outline: 'none',
  background: 'var(--bg)', color: 'var(--text)', minWidth: 0, flex: 1,
}

const iconBtn: React.CSSProperties = {
  width: 28, height: 28, border: '1px solid var(--border)', borderRadius: 7,
  background: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', fontSize: 13, color: 'var(--text3)', flexShrink: 0,
  fontFamily: 'var(--font)',
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// day_of_week: 0=Dimanche, 1=Lundi … 6=Samedi  (JS convention)
const DAY_EN: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
}
const DAY_ABBR: Record<string, number> = {
  Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6,
}
const DAY_FR: Record<string, number> = {
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3,
  jeudi: 4, vendredi: 5, samedi: 6,
}

function expandRange(from: number, to: number): number[] {
  const days: number[] = []
  // Range wraps around Sunday (0) if needed: e.g. Sa(6) → Su(0)
  let cur = from
  while (true) {
    days.push(cur)
    if (cur === to) break
    cur = cur === 6 ? 0 : cur + 1
    if (days.length > 7) break
  }
  return days
}

function parseTime(t: string): string {
  // Normalise "09:00:00" or "9:00" → "09:00"
  const m = t.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return ''
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

type HourRow = { day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean; slot: number }

function parseFromLdJson(html: string): HourRow[] {
  const rows: HourRow[] = []
  const matches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]

  for (const match of matches) {
    try {
      const raw = JSON.parse(match[1])
      const items: any[] = Array.isArray(raw) ? raw.flat(2) : [raw]

      for (const item of items) {
        // --- openingHoursSpecification (most detailed) ---
        const specs = item.openingHoursSpecification
        if (specs) {
          for (const spec of (Array.isArray(specs) ? specs : [specs])) {
            const rawDays: string[] = Array.isArray(spec.dayOfWeek) ? spec.dayOfWeek : [spec.dayOfWeek || '']
            const opens = spec.opens ? parseTime(spec.opens) : null
            const closes = spec.closes ? parseTime(spec.closes) : null

            for (const rawDay of rawDays) {
              const dayName = rawDay.replace('https://schema.org/', '').replace('http://schema.org/', '')
              const dayNum = DAY_EN[dayName]
              if (dayNum === undefined) continue
              rows.push({ day_of_week: dayNum, open_time: opens, close_time: closes, is_closed: !opens, slot: 0 })
            }
          }
          if (rows.length > 0) return rows
        }

        // --- openingHours string format: ["Mo-Fr 09:00-18:00", "Sa 10:00-14:00"] ---
        const oh = item.openingHours
        if (oh) {
          const entries: string[] = Array.isArray(oh) ? oh : [oh]
          for (const entry of entries) {
            // e.g. "Mo-Fr 09:00-18:00" or "Sa" (closed)
            const m = entry.match(/^([A-Z][a-z])(?:-([A-Z][a-z]))?\s*(?:(\d{1,2}:\d{2})-(\d{1,2}:\d{2}))?/)
            if (!m) continue
            const fromDay = DAY_ABBR[m[1]]
            const toDay = m[2] ? DAY_ABBR[m[2]] : fromDay
            if (fromDay === undefined || toDay === undefined) continue
            const opens = m[3] ? parseTime(m[3]) : null
            const closes = m[4] ? parseTime(m[4]) : null
            for (const d of expandRange(fromDay, toDay)) {
              rows.push({ day_of_week: d, open_time: opens, close_time: closes, is_closed: !opens, slot: 0 })
            }
          }
          if (rows.length > 0) return rows
        }
      }
    } catch {}
  }
  return rows
}

function parseFromHtml(html: string): HourRow[] {
  const rows: HourRow[] = []
  // Google embeds hours in JS data objects — look for patterns like:
  // "Lundi","09:00","18:00" or ["Lundi",[["09:00","18:00"]]]
  // Try regex: day name followed by time range nearby
  const dayPattern = Object.keys(DAY_FR).join('|')
  const regex = new RegExp(`(${dayPattern})[^\\d]{0,30}?(\\d{1,2}[h:]\\d{2})\\s*[–\\-]\\s*(\\d{1,2}[h:]\\d{2})`, 'gi')
  let m: RegExpExecArray | null
  while ((m = regex.exec(html)) !== null) {
    const dayNum = DAY_FR[m[1].toLowerCase()]
    if (dayNum === undefined) continue
    const opens = parseTime(m[2].replace('h', ':'))
    const closes = parseTime(m[3].replace('h', ':'))
    if (!opens || !closes) continue
    if (!rows.find(r => r.day_of_week === dayNum)) {
      rows.push({ day_of_week: dayNum, open_time: opens, close_time: closes, is_closed: false, slot: 0 })
    }
  }
  return rows
}

export async function POST(req: NextRequest) {
  const { place_id, name, city } = await req.json()
  if (!place_id || !name) return NextResponse.json({ error: 'place_id et name requis' }, { status: 400 })

  const query = `${name} ${city || ''} horaires`
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=fr&gl=fr&num=3`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache',
      },
    })

    const html = await res.text()

    // Try JSON-LD first (most reliable), fall back to HTML pattern
    let rows = parseFromLdJson(html)
    if (rows.length === 0) rows = parseFromHtml(html)

    if (rows.length === 0) return NextResponse.json({ place_id, found: false })

    // Deduplicate by day (keep first occurrence per day)
    const seen = new Set<number>()
    const deduped = rows.filter(r => {
      if (seen.has(r.day_of_week)) return false
      seen.add(r.day_of_week)
      return true
    })

    // Check si des horaires existent déjà → skip
    const { count } = await supabaseAdmin.from('opening_hours').select('id', { count: 'exact', head: true }).eq('place_id', place_id)
    if ((count ?? 0) > 0) return NextResponse.json({ place_id, found: false, skipped: true })

    // Insert new rows
    await supabaseAdmin.from('opening_hours').delete().eq('place_id', place_id)
    const toInsert = deduped.map(r => ({ ...r, place_id }))
    const { error } = await supabaseAdmin.from('opening_hours').insert(toInsert)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ place_id, found: true, days: deduped.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur scraping' }, { status: 500 })
  }
}

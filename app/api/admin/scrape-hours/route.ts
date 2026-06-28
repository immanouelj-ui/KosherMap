import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// day_of_week: 0=Dimanche, 1=Lundi … 6=Samedi
const DAY_ABBR: Record<string, number> = {
  Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6,
}

type HourRow = {
  place_id: string
  day_of_week: number
  open_time: string | null
  close_time: string | null
  is_closed: boolean
  slot: number
}

function parseTime(t: string): string {
  const m = t.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return ''
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

function expandRange(from: number, to: number): number[] {
  const days: number[] = []
  let cur = from
  while (true) {
    days.push(cur)
    if (cur === to) break
    cur = cur === 6 ? 0 : cur + 1
    if (days.length > 7) break
  }
  return days
}

// Parse OSM opening_hours format: "Mo-Fr 09:00-18:00; Sa 10:00-14:00; Su off"
function parseOsmHours(oh: string, placeId: string): HourRow[] {
  const rows: HourRow[] = []
  const parts = oh.split(';').map(s => s.trim()).filter(Boolean)

  for (const part of parts) {
    // Match: "Mo-Fr 09:00-18:00" or "Sa 10:00-14:00" or "Su off" or "Su closed"
    const m = part.match(/^([A-Z][a-z])(?:-([A-Z][a-z]))?\s*(.+)?$/)
    if (!m) continue

    const fromDay = DAY_ABBR[m[1]]
    const toDay = m[2] ? DAY_ABBR[m[2]] : fromDay
    if (fromDay === undefined || toDay === undefined) continue

    const timeStr = (m[3] || '').trim().toLowerCase()
    const isClosed = !timeStr || timeStr === 'off' || timeStr === 'closed'

    let open_time: string | null = null
    let close_time: string | null = null

    if (!isClosed) {
      const timeMatch = timeStr.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/)
      if (timeMatch) {
        open_time = parseTime(timeMatch[1])
        close_time = parseTime(timeMatch[2])
      }
    }

    for (const day of expandRange(fromDay, toDay)) {
      rows.push({ place_id: placeId, day_of_week: day, open_time, close_time, is_closed: isClosed, slot: 0 })
    }
  }

  return rows
}

async function fetchHoursFromOSM(name: string, city: string): Promise<string | null> {
  const query = `
[out:json][timeout:15];
area["name"="${city}"]["boundary"="administrative"]->.searchArea;
(
  node["name"~"${name.replace(/"/g, '')}",i]["opening_hours"](area.searchArea);
  way["name"~"${name.replace(/"/g, '')}",i]["opening_hours"](area.searchArea);
);
out body;
`
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!res.ok) return null
  const data = await res.json()
  const el = (data.elements || [])[0]
  return el?.tags?.opening_hours || null
}

export async function POST(req: NextRequest) {
  const { place_id, name, city } = await req.json()
  if (!place_id || !name) return NextResponse.json({ error: 'place_id et name requis' }, { status: 400 })

  try {
    // Skip si des horaires existent déjà
    const { count } = await supabaseAdmin
      .from('opening_hours')
      .select('id', { count: 'exact', head: true })
      .eq('place_id', place_id)
    if ((count ?? 0) > 0) return NextResponse.json({ place_id, found: false, skipped: true })

    const ohString = await fetchHoursFromOSM(name, city || '')
    if (!ohString) return NextResponse.json({ place_id, found: false })

    const rows = parseOsmHours(ohString, place_id)
    if (rows.length === 0) return NextResponse.json({ place_id, found: false })

    await supabaseAdmin.from('opening_hours').insert(rows)

    return NextResponse.json({ place_id, found: true, days: rows.length, raw: ohString })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur OSM' }, { status: 500 })
  }
}

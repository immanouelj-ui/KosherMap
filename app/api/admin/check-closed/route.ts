import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Cherche un lieu sur OpenStreetMap par nom + ville
// Retourne true si le lieu est marqué comme fermé définitivement
async function checkClosedOnOSM(name: string, city: string): Promise<boolean> {
  const query = `
[out:json][timeout:15];
area["name"="${city}"]["boundary"="administrative"]->.searchArea;
(
  node["name"~"${name.replace(/"/g, '')}",i](area.searchArea);
  way["name"~"${name.replace(/"/g, '')}",i](area.searchArea);
);
out body;
`
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!res.ok) return false
  const data = await res.json()

  for (const el of (data.elements || [])) {
    const tags = el.tags || {}
    // Tags OSM indiquant une fermeture définitive
    const keys = Object.keys(tags)
    if (
      keys.some(k => k.startsWith('disused:') || k.startsWith('abandoned:') || k.startsWith('demolished:') || k.startsWith('removed:')) ||
      tags['end_date'] ||
      tags['opening_hours'] === 'closed' ||
      tags['opening_hours'] === 'off'
    ) {
      return true
    }
  }

  return false
}

export async function POST(req: NextRequest) {
  const { place_id, name, city } = await req.json()
  if (!place_id || !name) return NextResponse.json({ error: 'place_id et name requis' }, { status: 400 })

  try {
    const closed = await checkClosedOnOSM(name, city || '')

    if (closed) {
      await supabaseAdmin.from('places').update({ is_deleted: true }).eq('id', place_id)
    }

    return NextResponse.json({ place_id, name, closed })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur OSM' }, { status: 500 })
  }
}

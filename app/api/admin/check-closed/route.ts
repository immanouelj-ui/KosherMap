import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const { place_id, name, city } = await req.json()
  if (!place_id || !name) return NextResponse.json({ error: 'place_id et name requis' }, { status: 400 })

  const query = [name, city].filter(Boolean).join(' ')
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
    const lower = html.toLowerCase()
    const isClosed =
      lower.includes('définitivement fermé') ||
      lower.includes('définitivement close') ||
      lower.includes('permanently closed') ||
      lower.includes('closed permanently')

    if (isClosed) {
      await supabaseAdmin.from('places').update({ is_deleted: true }).eq('id', place_id)
    }

    return NextResponse.json({ place_id, name, closed: isClosed })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur scraping' }, { status: 500 })
  }
}

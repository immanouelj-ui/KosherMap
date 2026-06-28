import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { place_id, place_name } = await req.json()
  if (!place_id) return NextResponse.json({ error: 'place_id requis' }, { status: 400 })

  const key = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID
  if (!key) return NextResponse.json({ error: 'STRIPE_SECRET_KEY manquant' }, { status: 500 })
  if (!priceId) return NextResponse.json({ error: 'STRIPE_PRICE_ID manquant' }, { status: 500 })

  try {
    const stripe = new Stripe(key, { apiVersion: '2026-06-24.dahlia' })
    const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.koshermap.store'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { place_id, place_name: place_name || '' },
      ui_mode: 'embedded_page',
      return_url: `${BASE}/premium/success?place_id=${place_id}&session_id={CHECKOUT_SESSION_ID}`,
      locale: 'fr',
    })

    return NextResponse.json({ clientSecret: session.client_secret })
  } catch (e: any) {
    console.error('Stripe error:', e)
    return NextResponse.json({ error: e?.message || 'Erreur Stripe inconnue' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const { place_id, place_name } = await req.json()
  if (!place_id) return NextResponse.json({ error: 'place_id requis' }, { status: 400 })

  const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.koshermap.store'
  const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID

  if (!priceId) return NextResponse.json({ error: 'STRIPE_PRICE_ID non configuré' }, { status: 500 })

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { place_id, place_name: place_name || '' },
    success_url: `${BASE}/premium/success?place_id=${place_id}`,
    cancel_url: `${BASE}/premium`,
    locale: 'fr',
    payment_method_types: ['card'],
  })

  return NextResponse.json({ url: session.url })
}

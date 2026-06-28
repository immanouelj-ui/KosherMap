import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!key || !webhookSecret) return NextResponse.json({ error: 'Stripe non configuré' }, { status: 500 })

  const stripe = new Stripe(key)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const place_id = session.metadata?.place_id
    if (place_id) {
      await supabase.from('places').update({
        is_premium: true,
        premium_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        stripe_subscription_id: session.subscription as string,
        stripe_customer_id: session.customer as string,
      }).eq('id', place_id)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    await supabase.from('places').update({
      is_premium: false,
      premium_until: null,
      stripe_subscription_id: null,
    }).eq('stripe_subscription_id', sub.id)
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const subId = (invoice as any).subscription
    if (subId) {
      await supabase.from('places').update({ is_premium: false }).eq('stripe_subscription_id', subId)
    }
  }

  return NextResponse.json({ received: true })
}

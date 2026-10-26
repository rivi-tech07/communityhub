import { NextResponse } from 'next/server';
import { authenticate, getAdminClient } from '../../../../lib/server-auth';
import { requireFeature } from '../../../../lib/feature-flags';
import {
  createProviderPayment,
  isSupportedCheckoutCurrency,
  resolveProvider,
} from '../../../../lib/payments';

async function releaseOrderStock(client: ReturnType<typeof getAdminClient>, orderId: string) {
  const { data: reservations, error } = await client
    .from('stock_reservations')
    .select('id')
    .eq('order_id', orderId)
    .eq('status', 'held');
  if (error) throw error;
  for (const reservation of reservations ?? []) {
    const result = await client.rpc('release_stock_reservation', {
      p_reservation_id: reservation.id,
    });
    if (result.error) throw result.error;
  }
}

export async function POST(request: Request) {
  const disabled = await requireFeature(request, 'checkout');
  if (disabled) return disabled;
  const result = await authenticate(request);
  if (result instanceof NextResponse) return result;
  const body = (await request.json().catch(() => null)) as {
    purpose?: 'physical_order' | 'service_request' | 'promotion';
    referenceId?: string;
    idempotencyKey?: string;
  } | null;
  if (!body?.purpose || !body.referenceId || !body.idempotencyKey)
    return NextResponse.json(
      { error: 'Purpose, reference, and idempotency key are required.' },
      { status: 400 },
    );
  const client = getAdminClient();
  let amountMinor = 0;
  let currency = 'GBP';
  let country: 'GB' | 'IN' = 'GB';
  let description = body.purpose;
  let merchantOwnerId: string | null = null;
  if (body.purpose === 'physical_order') {
    const { data: order, error } = await client
      .from('orders')
      .select('id,buyer_id,business_id,total,currency,status,businesses(owner_id,country)')
      .eq('id', body.referenceId)
      .eq('buyer_id', result.user.id)
      .single();
    if (error || !order || order.status !== 'pending_payment')
      return NextResponse.json({ error: 'Checkout order is not available.' }, { status: 400 });
    amountMinor = Math.round(Number(order.total) * 100);
    currency = order.currency;
    const business = Array.isArray(order.businesses) ? order.businesses[0] : order.businesses;
    country = business?.country === 'India' ? 'IN' : 'GB';
    merchantOwnerId = business?.owner_id ?? null;
    description = `CommunityHub order ${order.id}`;
  }
  if (body.purpose === 'service_request') {
    const { data: serviceRequest, error } = await client
      .from('service_requests')
      .select('id,requester_id,status,quoted_price_minor,quoted_currency,services(owner_id)')
      .eq('id', body.referenceId)
      .eq('requester_id', result.user.id)
      .single();
    if (
      error ||
      !serviceRequest ||
      serviceRequest.status !== 'accepted' ||
      !serviceRequest.quoted_price_minor ||
      !serviceRequest.quoted_currency
    )
      return NextResponse.json(
        { error: 'Service checkout requires an accepted provider quote.' },
        { status: 400 },
      );
    amountMinor = serviceRequest.quoted_price_minor;
    currency = serviceRequest.quoted_currency;
    country = currency === 'INR' ? 'IN' : 'GB';
    const service = Array.isArray(serviceRequest.services)
      ? serviceRequest.services[0]
      : serviceRequest.services;
    merchantOwnerId = service?.owner_id ?? null;
    description = `CommunityHub service request ${serviceRequest.id}`;
  }
  if (body.purpose === 'promotion') {
    const { data: promotion, error } = await client
      .from('promotions')
      .select('id,purchaser_id,price_minor,currency,status:entitlement_status')
      .eq('id', body.referenceId)
      .eq('purchaser_id', result.user.id)
      .single();
    if (error || !promotion || promotion.status !== 'pending_payment')
      return NextResponse.json({ error: 'Promotion purchase is not available.' }, { status: 400 });
    amountMinor = promotion.price_minor;
    currency = promotion.currency;
    country = currency === 'INR' ? 'IN' : 'GB';
    description = `CommunityHub promotion ${promotion.id}`;
  }
  if (
    !isSupportedCheckoutCurrency(currency) ||
    (country === 'GB' && currency !== 'GBP') ||
    (country === 'IN' && currency !== 'INR')
  )
    return NextResponse.json(
      { error: 'This checkout currency is not supported for the configured merchant country.' },
      { status: 400 },
    );
  const providerName = resolveProvider(country);
  if (merchantOwnerId) {
    const { data: account } = await client
      .from('payment_accounts')
      .select('id')
      .eq('owner_id', merchantOwnerId)
      .eq('country', country)
      .eq('provider', providerName)
      .eq('approval_status', 'approved')
      .eq('is_enabled', true)
      .maybeSingle();
    if (!account)
      return NextResponse.json(
        { error: 'This merchant is not payment-enabled for this country/provider.' },
        { status: 409 },
      );
  }
  const existing = await client
    .from('payment_transactions')
    .select('*')
    .eq('idempotency_key', body.idempotencyKey)
    .maybeSingle();
  if (existing.data) return NextResponse.json({ transaction: existing.data, replay: true });
  if (body.purpose === 'physical_order') {
    const { error: reservationError } = await client.rpc('reserve_stock_for_order', {
      p_order_id: body.referenceId,
      p_ttl_seconds: 900,
    });
    if (reservationError)
      return NextResponse.json(
        {
          error: reservationError.message.includes('Insufficient stock')
            ? 'One or more items are out of stock.'
            : 'Stock could not be reserved. Please try again.',
        },
        { status: 409 },
      );
  }
  let payment;
  try {
    payment = await createProviderPayment({
      country,
      amountMinor,
      currency,
      idempotencyKey: body.idempotencyKey!,
      description,
    });
  } catch (error) {
    if (body.purpose === 'physical_order') await releaseOrderStock(client, body.referenceId);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment provider is unavailable.' },
      { status: 503 },
    );
  }
  const { data: transaction, error } = await client
    .from('payment_transactions')
    .insert({
      payer_id: result.user.id,
      provider: payment.provider,
      provider_payment_id: payment.providerPaymentId,
      provider_order_id: payment.providerOrderId,
      purpose: body.purpose,
      reference_id: body.referenceId,
      amount_minor: amountMinor,
      currency,
      status: payment.status,
      idempotency_key: body.idempotencyKey,
      metadata: { country, testMode: process.env.PAYMENTS_LIVE_ENABLED !== 'true' },
    })
    .select('*')
    .single();
  if (error)
    if (body.purpose === 'physical_order') await releaseOrderStock(client, body.referenceId);
  if (error)
    return NextResponse.json(
      { error: 'Payment transaction could not be recorded.' },
      { status: 409 },
    );
  return NextResponse.json({ transaction, clientSecret: payment.clientSecret ?? null });
}

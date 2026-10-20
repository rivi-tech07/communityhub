import { NextResponse } from 'next/server';
import { getAdminClient } from '../../../../lib/server-auth';
import { verifyWebhook } from '../../../../lib/payments';
import type { PaymentProvider } from '@communityhub/shared';
import { createHash } from 'node:crypto';

type WebhookObject = {
  [key: string]: unknown;
  last_payment_error?: { code?: unknown; message?: unknown };
};
type WebhookEvent = {
  id?: unknown;
  event?: unknown;
  type?: unknown;
  data?: { object?: WebhookObject };
  payload?: { payment?: { entity?: WebhookObject }; refund?: { entity?: WebhookObject } };
};

export const runtime = 'nodejs';
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: PaymentProvider }> },
) {
  const { provider } = await params;
  if (provider !== 'stripe' && provider !== 'razorpay')
    return NextResponse.json({ error: 'Unsupported provider.' }, { status: 400 });
  const payload = await request.text();
  const signature =
    request.headers.get(provider === 'stripe' ? 'stripe-signature' : 'x-razorpay-signature') ?? '';
  if (!verifyWebhook(provider, payload, signature))
    return NextResponse.json({ error: 'Webhook signature is invalid.' }, { status: 400 });
  const event = JSON.parse(payload) as WebhookEvent;
  const type = String(event.type ?? '');
  const object =
    event.data?.object ?? event.payload?.payment?.entity ?? event.payload?.refund?.entity ?? {};
  const providerPaymentId = String(object.payment_intent ?? object.id ?? '');
  const providerOrderId = String(object.order_id ?? '');
  const client = getAdminClient();
  const providerEventId = String(
    event.id ?? event.event ?? createHash('sha256').update(payload).digest('hex'),
  );
  const audit = await client
    .from('payment_webhook_events')
    .insert({
      provider,
      provider_event_id: providerEventId,
      event_type: type,
      payload_hash: createHash('sha256').update(payload).digest('hex'),
    })
    .select('id')
    .single();
  if (audit.error?.code === '23505') return NextResponse.json({ received: true, duplicate: true });
  const lookup =
    providerPaymentId && providerPaymentId !== 'undefined'
      ? client
          .from('payment_transactions')
          .select('*')
          .eq('provider', provider)
          .eq('provider_payment_id', providerPaymentId)
          .maybeSingle()
      : client
          .from('payment_transactions')
          .select('*')
          .eq('provider', provider)
          .eq('provider_order_id', providerOrderId)
          .maybeSingle();
  const { data: transaction } = await lookup;
  if (!transaction) return NextResponse.json({ received: true, ignored: true });
  const succeeded = type === 'payment_intent.succeeded' || type === 'payment.captured';
  const failed = type === 'payment_intent.payment_failed' || type === 'payment.failed';
  const refunded = type.includes('refunded') || type === 'refund.processed';
  if (refunded) {
    await client
      .from('payment_transactions')
      .update({ status: 'refunded', refund_amount_minor: transaction.amount_minor })
      .eq('id', transaction.id);
    return NextResponse.json({ received: true });
  }
  if (succeeded) {
    const update = await client
      .from('payment_transactions')
      .update({
        status: 'succeeded',
        provider_payment_id: providerPaymentId || transaction.provider_payment_id,
        provider_order_id: providerOrderId || transaction.provider_order_id,
      })
      .eq('id', transaction.id)
      .neq('status', 'succeeded');
    if (update.error)
      return NextResponse.json({ error: 'Transaction update failed.' }, { status: 500 });
    if (transaction.purpose === 'physical_order')
      await client
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', transaction.reference_id)
        .eq('status', 'pending_payment');
    if (transaction.purpose === 'promotion') {
      await client
        .from('promotions')
        .update({ transaction_id: transaction.id })
        .eq('id', transaction.reference_id);
      const { data: promotion } = await client
        .from('promotions')
        .select('approval_status,starts_at,expires_at')
        .eq('id', transaction.reference_id)
        .single();
      if (promotion?.approval_status === 'approved' && new Date(promotion.expires_at) > new Date())
        await client
          .from('promotions')
          .update({ entitlement_status: 'active' })
          .eq('id', transaction.reference_id);
    }
  } else if (failed) {
    await client
      .from('payment_transactions')
      .update({
        status: 'failed',
        failure_code: String(
          object.last_payment_error?.code ?? object.error_code ?? 'provider_failure',
        ),
        failure_message: String(
          object.last_payment_error?.message ?? object.error_description ?? 'Payment failed.',
        ),
      })
      .eq('id', transaction.id)
      .neq('status', 'succeeded');
    if (transaction.purpose === 'physical_order')
      await client
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', transaction.reference_id)
        .eq('status', 'pending_payment');
  }
  return NextResponse.json({ received: true });
}

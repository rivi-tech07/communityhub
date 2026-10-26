import { createHash, randomUUID } from 'node:crypto';
import { createStructuredLogger, type PaymentProvider } from '@communityhub/shared';
import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import { verifyWebhook } from '../../../../lib/payments';
import { getAdminClient } from '../../../../lib/server-auth';

type WebhookObject = {
  [key: string]: unknown;
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
  const requestId = request.headers.get('x-request-id') ?? randomUUID();
  const logger = createStructuredLogger({ requestId, route: `/api/payments/webhooks/${provider}` });
  Sentry.setTag('request_id', requestId);
  if (provider !== 'stripe' && provider !== 'razorpay')
    return NextResponse.json({ error: 'Unsupported provider.' }, { status: 400 });
  const payload = await request.text();
  const signature =
    request.headers.get(provider === 'stripe' ? 'stripe-signature' : 'x-razorpay-signature') ?? '';
  if (!verifyWebhook(provider, payload, signature)) {
    logger.warn('payment webhook rejected', {
      provider,
      provider_event_id: 'unknown',
      event_type: 'unknown',
      outcome: 'rejected_signature',
    });
    return NextResponse.json({ error: 'Webhook signature is invalid.' }, { status: 400 });
  }
  let event: WebhookEvent;
  try {
    event = JSON.parse(payload) as WebhookEvent;
  } catch {
    logger.warn('payment webhook rejected', {
      provider,
      provider_event_id: 'unknown',
      event_type: 'unknown',
      outcome: 'rejected_invalid_json',
    });
    return NextResponse.json({ error: 'Webhook payload is invalid.' }, { status: 400 });
  }
  const type = String(event.type ?? '');
  const object =
    event.data?.object ?? event.payload?.payment?.entity ?? event.payload?.refund?.entity ?? {};
  const providerPaymentId = String(object.payment_intent ?? object.id ?? '');
  const providerOrderId = String(object.order_id ?? '');
  const providerEventId = String(
    event.id ?? event.event ?? createHash('sha256').update(payload).digest('hex'),
  );
  try {
    const { data, error } = await getAdminClient().rpc('process_payment_event', {
      p_provider: provider,
      p_provider_event_id: providerEventId,
      p_event_type: type,
      p_provider_payment_id: providerPaymentId || null,
      p_provider_order_id: providerOrderId || null,
      p_payload: event,
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    const outcome = String(result?.outcome ?? 'processed');
    logger.info('payment webhook processed', {
      provider,
      provider_event_id: providerEventId,
      event_type: type,
      outcome,
    });
    return NextResponse.json({
      received: true,
      duplicate: Boolean(result?.duplicate),
      ignored: outcome === 'ignored',
    });
  } catch {
    logger.error('payment webhook failed', {
      provider,
      provider_event_id: providerEventId,
      event_type: type,
      outcome: 'failed',
    });
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}

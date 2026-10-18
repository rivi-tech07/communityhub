import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PaymentProvider } from '@communityhub/shared';

export type MerchantCountry = 'GB' | 'IN';
export type PaymentIntentResult = {
  provider: PaymentProvider;
  providerPaymentId: string | null;
  providerOrderId: string | null;
  clientSecret?: string;
  status: 'pending' | 'succeeded';
};

function configuredProvider(country: MerchantCountry): PaymentProvider {
  const value = (
    country === 'GB' ? process.env.PAYMENT_PROVIDER_GB : process.env.PAYMENT_PROVIDER_IN
  ) as PaymentProvider | undefined;
  if (value !== 'stripe' && value !== 'razorpay')
    throw new Error(`No approved payment provider is configured for ${country}.`);
  return value;
}
function secret(provider: PaymentProvider) {
  const live = process.env.PAYMENTS_LIVE_ENABLED === 'true';
  const value =
    provider === 'stripe'
      ? live
        ? process.env.STRIPE_LIVE_SECRET_KEY
        : process.env.STRIPE_TEST_SECRET_KEY
      : live
        ? process.env.RAZORPAY_LIVE_KEY_SECRET
        : process.env.RAZORPAY_TEST_KEY_SECRET;
  if (!value) throw new Error(`Payment provider ${provider} credentials are not configured.`);
  return value;
}
function razorpayKeyId() {
  const value =
    process.env.PAYMENTS_LIVE_ENABLED === 'true'
      ? process.env.RAZORPAY_LIVE_KEY_ID
      : process.env.RAZORPAY_TEST_KEY_ID;
  if (!value) throw new Error('Razorpay key ID is not configured.');
  return value;
}
export function resolveProvider(country: MerchantCountry) {
  return configuredProvider(country);
}
export async function createProviderPayment(input: {
  country: MerchantCountry;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
  description: string;
}): Promise<PaymentIntentResult> {
  const provider = configuredProvider(input.country);
  const key = secret(provider);
  if (provider === 'stripe') {
    const params = new URLSearchParams({
      amount: String(input.amountMinor),
      currency: input.currency.toLowerCase(),
      'payment_method_types[]': 'card',
      description: input.description,
    });
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': input.idempotencyKey,
      },
      body: params,
    });
    const body = (await response.json()) as {
      id?: string;
      client_secret?: string;
      status?: string;
      error?: { message?: string };
    };
    if (!response.ok || !body.id)
      throw new Error(body.error?.message ?? 'Stripe payment creation failed.');
    return {
      provider,
      providerPaymentId: body.id,
      providerOrderId: null,
      clientSecret: body.client_secret,
      status: body.status === 'succeeded' ? 'succeeded' : 'pending',
    };
  }
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${razorpayKeyId()}:${key}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amountMinor,
      currency: input.currency,
      receipt: input.idempotencyKey,
      notes: { description: input.description },
    }),
  });
  const body = (await response.json()) as {
    id?: string;
    status?: string;
    error?: { description?: string };
  };
  if (!response.ok || !body.id)
    throw new Error(body.error?.description ?? 'Razorpay order creation failed.');
  return { provider, providerPaymentId: null, providerOrderId: body.id, status: 'pending' };
}
export function verifyStripeSignature(
  payload: string,
  signature: string,
  secretKey: string,
  toleranceSeconds = 300,
) {
  const parts = Object.fromEntries(signature.split(',').map((part) => part.split('=')));
  const timestamp = Number(parts.t);
  const expected = createHmac('sha256', secretKey).update(`${timestamp}.${payload}`).digest('hex');
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds || !parts.v1)
    return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}
export function verifyRazorpaySignature(payload: string, signature: string, secretKey: string) {
  const expected = createHmac('sha256', secretKey).update(payload).digest('hex');
  return (
    Boolean(signature) &&
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  );
}
export function verifyWebhook(provider: PaymentProvider, payload: string, signature: string) {
  const key =
    provider === 'stripe' ? process.env.STRIPE_WEBHOOK_SECRET : process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!key) return false;
  return provider === 'stripe'
    ? verifyStripeSignature(payload, signature, key)
    : verifyRazorpaySignature(payload, signature, key);
}
export function isPromotionActive(
  promotion: {
    entitlement_status: string;
    approval_status: string;
    starts_at: string;
    expires_at: string;
  },
  now = new Date(),
) {
  return (
    promotion.entitlement_status === 'active' &&
    promotion.approval_status === 'approved' &&
    new Date(promotion.starts_at) <= now &&
    new Date(promotion.expires_at) > now
  );
}
export function isSupportedCheckoutCurrency(currency: string) {
  return currency === 'GBP' || currency === 'INR';
}
export async function refundProviderPayment(input: {
  provider: PaymentProvider;
  providerPaymentId: string;
  amountMinor?: number;
}) {
  const key = secret(input.provider);
  if (input.provider === 'stripe') {
    const body = new URLSearchParams({ payment_intent: input.providerPaymentId });
    if (input.amountMinor) body.set('amount', String(input.amountMinor));
    const response = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!response.ok) throw new Error('Stripe refund failed.');
    return;
  }
  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${input.providerPaymentId}/refund`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${razorpayKeyId()}:${key}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input.amountMinor ? { amount: input.amountMinor } : {}),
    },
  );
  if (!response.ok) throw new Error('Razorpay refund failed.');
}

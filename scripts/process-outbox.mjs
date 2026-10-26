import { createClient } from '@supabase/supabase-js';
import { RETRY_DELAYS_SECONDS } from './outbox-policy.mjs';

const executionId =
  process.env.REQUEST_ID ?? `worker-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const log = (level, message, context = {}) =>
  console.log(JSON.stringify({ level, message, requestId: executionId, ...context }));
const errorMessage = (error) => (error instanceof Error ? error.message : String(error));

export async function sendApplicationMessage(message, fetchImpl = globalThis.fetch) {
  const url =
    message.channel === 'email'
      ? process.env.OUTBOX_EMAIL_WEBHOOK_URL
      : process.env.OUTBOX_SMS_WEBHOOK_URL;
  if (!url)
    throw new Error(`No ${message.channel} application notification provider is configured.`);
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.OUTBOX_PROVIDER_TOKEN
        ? { authorization: `Bearer ${process.env.OUTBOX_PROVIDER_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({
      template: message.template,
      recipient: message.recipient,
      payload: message.payload,
    }),
  });
  if (!response.ok) throw new Error(`Notification provider returned HTTP ${response.status}.`);
}

export async function processOutboxMessage(admin, message, send = sendApplicationMessage) {
  if (message.status === 'sent' || message.status === 'dead')
    return { status: message.status, noop: true };
  try {
    await send(message);
    const { error } = await admin
      .from('outbox_messages')
      .update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null })
      .eq('id', message.id);
    if (error) throw error;
    log('info', 'outbox message sent', {
      provider: message.channel,
      provider_event_id: message.id,
      event_type: message.template,
      outcome: 'sent',
    });
    return { status: 'sent', noop: false };
  } catch (error) {
    const attempts = Number(message.attempts ?? 0);
    const dead = attempts >= RETRY_DELAYS_SECONDS.length;
    const update = dead
      ? { status: 'dead', last_error: errorMessage(error).slice(0, 2000) }
      : {
          status: 'failed',
          next_attempt_at: new Date(
            Date.now() + RETRY_DELAYS_SECONDS[attempts] * 1000,
          ).toISOString(),
          last_error: errorMessage(error).slice(0, 2000),
        };
    const { error: updateError } = await admin
      .from('outbox_messages')
      .update(update)
      .eq('id', message.id);
    if (updateError) throw updateError;
    log('warn', 'outbox message failed', {
      provider: message.channel,
      provider_event_id: message.id,
      event_type: message.template,
      outcome: dead ? 'dead' : 'retry',
    });
    if (dead)
      log('error', 'outbox message dead-lettered', {
        type: 'outbox_dead_letter',
        provider: message.channel,
        provider_event_id: message.id,
        event_type: message.template,
        outcome: 'dead',
      });
    return { status: update.status, error: errorMessage(error) };
  }
}

export async function processNextOutbox(admin, send = sendApplicationMessage) {
  const { data, error } = await admin.rpc('claim_outbox_messages', {
    p_limit: 1,
    p_lease: '2 minutes',
  });
  if (error) throw error;
  const message = Array.isArray(data) ? data[0] : data;
  return message ? processOutboxMessage(admin, message, send) : null;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey)
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await processNextOutbox(admin);
  log('info', 'outbox worker completed', {
    outcome: result?.status ?? 'idle',
  });
}
if (process.argv[1]?.endsWith('process-outbox.mjs'))
  main().catch((error) => {
    log('error', 'outbox worker failed', {
      outcome: 'failed',
      error_type: error?.constructor?.name ?? 'UnknownError',
    });
    process.exit(1);
  });

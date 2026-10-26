import { describe, expect, it, vi } from 'vitest';
import { processOutboxMessage, RETRY_DELAYS_SECONDS } from '../scripts/process-outbox.mjs';

function admin() {
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  return { client: { from: vi.fn(() => ({ update })) }, update };
}

describe('application notification outbox', () => {
  it('keeps the row retryable when the provider is unreachable', async () => {
    const db = admin();
    const result = await processOutboxMessage(
      db.client,
      {
        id: 'one',
        channel: 'email',
        template: 'x',
        recipient: 'a@example.com',
        payload: {},
        status: 'pending',
        attempts: 1,
      },
      vi.fn().mockRejectedValue(new Error('provider offline')),
    );
    expect(result.status).toBe('failed');
    expect(db.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        last_error: 'provider offline',
        next_attempt_at: expect.any(String),
      }),
    );
  });
  it('dead-letters after five attempts', async () => {
    const db = admin();
    await processOutboxMessage(
      db.client,
      {
        id: 'two',
        channel: 'sms',
        template: 'x',
        recipient: '+441',
        payload: {},
        status: 'pending',
        attempts: RETRY_DELAYS_SECONDS.length,
      },
      vi.fn().mockRejectedValue(new Error('down')),
    );
    expect(db.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'dead', last_error: 'down' }),
    );
  });
  it('does not call the provider for sent or dead messages', async () => {
    const db = admin();
    const send = vi.fn();
    await processOutboxMessage(
      db.client,
      {
        id: 'three',
        channel: 'email',
        template: 'x',
        recipient: 'a@example.com',
        payload: {},
        status: 'sent',
        attempts: 1,
      },
      send,
    );
    await processOutboxMessage(
      db.client,
      {
        id: 'three',
        channel: 'email',
        template: 'x',
        recipient: 'a@example.com',
        payload: {},
        status: 'dead',
        attempts: 5,
      },
      send,
    );
    expect(send).not.toHaveBeenCalled();
  });
});

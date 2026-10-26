import { describe, expect, it } from 'vitest';
import {
  applyDeletionEvent,
  applyReservationEvent,
  dedupeOutbox,
} from '../packages/shared/src/batch2-policy';

describe('Batch 2 offline policy models', () => {
  it('conserves stock across reserve, commit, release, and expiry events', () => {
    let state = { stock: 3, reservations: {} };
    state = applyReservationEvent(state, { type: 'reserve', id: 'held', quantity: 1 });
    state = applyReservationEvent(state, { type: 'reserve', id: 'committed', quantity: 1 });
    state = applyReservationEvent(state, { type: 'commit', id: 'committed' });
    state = applyReservationEvent(state, { type: 'expire', id: 'held' });
    expect(state.stock).toBe(2);
    expect(state.reservations).toMatchObject({
      held: { quantity: 1, status: 'expired' },
      committed: { quantity: 1, status: 'committed' },
    });
    expect(applyReservationEvent(state, { type: 'expire', id: 'held' })).toEqual(state);
  });

  it('allows deletion retries but makes completion terminal', () => {
    expect(applyDeletionEvent('queued', 'claim')).toBe('processing');
    expect(applyDeletionEvent('processing', 'fail')).toBe('failed');
    expect(applyDeletionEvent('failed', 'claim')).toBe('processing');
    expect(applyDeletionEvent('processing', 'complete')).toBe('completed');
    expect(applyDeletionEvent('completed', 'claim')).toBe('completed');
  });

  it('deduplicates keyed notifications and preserves unkeyed messages', () => {
    const first = { dedupe_key: 'reset:user-1' };
    const duplicate = { dedupe_key: 'reset:user-1' };
    const unkeyed = { dedupe_key: null };
    expect(dedupeOutbox(dedupeOutbox([first], duplicate), unkeyed)).toEqual([first, unkeyed]);
  });
});

export type ReservationStatus = 'held' | 'committed' | 'released' | 'expired';

export type ReservationState = {
  stock: number;
  reservations: Record<string, { quantity: number; status: ReservationStatus }>;
};

export function applyReservationEvent(
  state: ReservationState,
  event:
    | { type: 'reserve'; id: string; quantity: number }
    | { type: 'commit'; id: string }
    | { type: 'release' | 'expire'; id: string },
): ReservationState {
  const current = state.reservations[event.id];
  if (event.type === 'reserve') {
    if (event.quantity <= 0 || state.stock < event.quantity) throw new Error('insufficient_stock');
    if (current) return state;
    return {
      stock: state.stock - event.quantity,
      reservations: {
        ...state.reservations,
        [event.id]: { quantity: event.quantity, status: 'held' },
      },
    };
  }
  if (!current || current.status !== 'held') return state;
  const status =
    event.type === 'commit' ? 'committed' : event.type === 'expire' ? 'expired' : 'released';
  return {
    stock: status === 'committed' ? state.stock : state.stock + current.quantity,
    reservations: { ...state.reservations, [event.id]: { ...current, status } },
  };
}

export type DeletionState = 'queued' | 'processing' | 'completed' | 'failed';

export function applyDeletionEvent(
  state: DeletionState,
  event: 'claim' | 'complete' | 'fail',
): DeletionState {
  if (state === 'completed') return state;
  if (event === 'claim' && (state === 'queued' || state === 'failed')) return 'processing';
  if (event === 'complete' && state === 'processing') return 'completed';
  if (event === 'fail' && state === 'processing') return 'failed';
  return state;
}

export function dedupeOutbox<T extends { dedupe_key?: string | null }>(
  messages: T[],
  candidate: T,
): T[] {
  if (!candidate.dedupe_key) return [...messages, candidate];
  return messages.some((message) => message.dedupe_key === candidate.dedupe_key)
    ? messages
    : [...messages, candidate];
}

export type PaymentEventStatus = 'received' | 'processed' | 'failed' | 'ignored';

export type PaymentEventRecord = {
  status: PaymentEventStatus;
  attempts: number;
  lastError: string | null;
};

export function shouldProcessPaymentEvent(event: PaymentEventRecord | undefined) {
  return !event || event.status !== 'processed';
}

export function markPaymentEventFailure(event: PaymentEventRecord, error: unknown) {
  return {
    ...event,
    status: 'failed' as const,
    attempts: event.attempts + 1,
    lastError: error instanceof Error ? error.message : String(error),
  };
}

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
describe('release security contracts', () => {
  it('keeps payment and private-document schemas protected by RLS', () => {
    const sql =
      readFileSync(
        resolve(root, 'supabase/migrations/202610180005_jobs_services_events.sql'),
        'utf8',
      ) +
      readFileSync(
        resolve(root, 'supabase/migrations/202610180006_payments_promotions.sql'),
        'utf8',
      );
    expect(sql).toContain('alter table public.payment_transactions enable row level security');
    expect(sql).toContain('alter table public.promotions enable row level security');
    expect(sql).toContain('private-documents');
    expect(sql).toContain('create policy "Payers read transactions"');
  });
  it('includes release operations and policy artifacts', () => {
    for (const file of [
      'docs/release-checklist.md',
      'docs/operations-runbook.md',
      'docs/privacy-policy.md',
      'docs/terms-of-service.md',
      'docs/moderation-policy.md',
      'docs/refund-policy.md',
    ])
      expect(existsSync(resolve(root, file))).toBe(true);
  });
});

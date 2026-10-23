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
  it('keeps public social browsing separate from protected social actions', () => {
    const sql = readFileSync(resolve(root, 'supabase/migrations/202610230001_public_social_browse.sql'), 'utf8');
    expect(sql).toContain('Anyone can browse public communities');
    expect(sql).toContain('Anyone can browse public posts');
    expect(sql).toContain('Authors and moderators can delete posts');
    expect(sql).toContain('Comment authors and moderators can delete comments');
  });
  it('keeps jobs, CVs, applications, and saved jobs access-controlled', () => {
    const sql = readFileSync(resolve(root, 'supabase/migrations/202610230002_jobs_applications.sql'), 'utf8');
    expect(sql).toContain('create table if not exists public.saved_jobs');
    expect(sql).toContain('Users save public jobs');
    expect(readFileSync(resolve(root, 'supabase/migrations/202610180005_jobs_services_events.sql'), 'utf8')).toContain('Users manage own CVs');
  });
});

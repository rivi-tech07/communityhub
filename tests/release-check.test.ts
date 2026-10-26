import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkBatchVerification, evaluateRelease } from '../scripts/release-check';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'communityhub-release-'));
  mkdirSync(join(root, 'apps/mobile'), { recursive: true });
  mkdirSync(join(root, 'docs/runbooks'), { recursive: true });
  mkdirSync(join(root, 'docs/legal'), { recursive: true });
  mkdirSync(join(root, 'docs/security'), { recursive: true });
  mkdirSync(join(root, 'docs/status'), { recursive: true });
  mkdirSync(join(root, 'packages/shared/src'), { recursive: true });
  writeFileSync(join(root, 'packages/shared/flags.ts'), 'export const flags = {};');
  mkdirSync(join(root, 'scripts'), { recursive: true });
  writeFileSync(join(root, 'scripts/check-mobile-no-payments.mjs'), 'process.exit(0);');
  writeFileSync(
    join(root, 'apps/mobile/app.json'),
    JSON.stringify({
      expo: {
        extra: { eas: { projectId: 'project-id' } },
        ios: { bundleIdentifier: 'com.example.app' },
        android: { package: 'com.example.app' },
      },
    }),
  );
  for (const file of [
    'README.md',
    'refund.md',
    'chargeback-dispute.md',
    'webhook-replay.md',
    'reconciliation.md',
    'failed-deletion.md',
    'backup-restore.md',
    'incident-response.md',
  ])
    writeFileSync(join(root, 'docs/runbooks', file), 'runbook');
  for (const file of ['terms-of-service.md', 'privacy-policy.md', 'dsar.md', 'dpa-notes.md'])
    writeFileSync(join(root, 'docs/legal', file), 'draft');
  writeFileSync(join(root, 'docs/release-checklist.md'), '- [x] done');
  writeFileSync(join(root, 'docs/security/rls-matrix.md'), 'all verified');
  writeFileSync(
    join(root, 'docs/status/batch2.md'),
    'Batch 2 verified against a disposable environment.',
  );
  writeFileSync(
    join(root, 'docs/status/batch2.verify.json'),
    JSON.stringify({
      schema_version: 1,
      batch: 'batch2',
      verified: true,
      verified_at: new Date().toISOString(),
      verified_by: 'test',
      commands_run: ['pnpm db:reset && pnpm db:seed && pnpm test'],
    }),
  );
  writeFileSync(join(root, 'README.md'), 'PAYMENTS_LIVE_ENABLED=false; deliberately disabled');
  writeFileSync(join(root, 'docs/environments.md'), 'PAYMENTS_LIVE_ENABLED=false');
  writeFileSync(join(root, '.env.example'), 'SUPABASE_SERVICE_ROLE_KEY=\n');
  writeFileSync(
    join(root, 'packages/shared/src/index.ts'),
    'export const MOBILE_IAP_ENABLED = false as const;',
  );
  return root;
}

const passing = () => ({ status: 0, output: '' });

describe('release check', () => {
  it('passes a complete production fixture', () => {
    const report = evaluateRelease({
      root: fixture(),
      production: true,
      trackedFiles: ['.env.example'],
      runMobileGuard: passing,
    });
    expect(report.blocking).toEqual([]);
  });

  it.each([
    ['missing runbook', (root: string) => rmSync(join(root, 'docs/runbooks/refund.md'))],
    [
      'disallowed runbook placeholder',
      (root: string) =>
        writeFileSync(join(root, 'docs/runbooks/refund.md'), '[PLACEHOLDER: provider deadline]'),
    ],
    ['missing legal draft', (root: string) => rmSync(join(root, 'docs/legal/privacy-policy.md'))],
    [
      'unchecked release checklist',
      (root: string) => writeFileSync(join(root, 'docs/release-checklist.md'), '- [ ] pending'),
    ],
    [
      'VERIFY RLS cell',
      (root: string) => writeFileSync(join(root, 'docs/security/rls-matrix.md'), 'VERIFY'),
    ],
    ['undocumented payment state', (root: string) => writeFileSync(join(root, 'README.md'), '')],
    ['committed env file', () => undefined],
    [
      'real-looking env secret',
      (root: string) =>
        writeFileSync(
          join(root, '.env.example'),
          'STRIPE_TEST_SECRET_KEY=sk_test_12345678901234567890',
        ),
    ],
    ['mobile guard failure', () => undefined],
    [
      'IAP enabled',
      (root: string) =>
        writeFileSync(
          join(root, 'packages/shared/src/index.ts'),
          'export const MOBILE_IAP_ENABLED = true as const;',
        ),
    ],
  ])('%s is blocking', (_name, mutate) => {
    const root = fixture();
    mutate(root);
    const report = evaluateRelease({
      root,
      production: true,
      trackedFiles: _name === 'committed env file' ? ['.env'] : ['.env.example'],
      runMobileGuard:
        _name === 'mobile guard failure'
          ? () => ({ status: 1, output: 'payment import found' })
          : passing,
    });
    expect(report.blocking.length).toBeGreaterThan(0);
  });

  it('blocks an unverified Batch 2 record and points to the record', () => {
    const root = fixture();
    writeFileSync(
      join(root, 'docs/status/batch2.verify.json'),
      JSON.stringify({ verified: false }),
    );
    const report = checkBatchVerification(root, true);
    expect(report.blocking.join('\n')).toContain('batch2.verify.json');
  });

  it('blocks stale verification', () => {
    const root = fixture();
    writeFileSync(
      join(root, 'docs/status/batch2.verify.json'),
      JSON.stringify({
        verified: true,
        verified_at: new Date(Date.now() - 45 * 86_400_000).toISOString(),
        commands_run: ['pnpm test'],
      }),
    );
    expect(checkBatchVerification(root, true).blocking.join('\n')).toContain('stale');
  });

  it('blocks an empty command record', () => {
    const root = fixture();
    writeFileSync(
      join(root, 'docs/status/batch2.verify.json'),
      JSON.stringify({ verified: true, verified_at: new Date().toISOString(), commands_run: [] }),
    );
    expect(checkBatchVerification(root, true).blocking.join('\n')).toContain(
      'no commands recorded',
    );
  });

  it('blocks an Unverified status item', () => {
    const root = fixture();
    writeFileSync(join(root, 'docs/status/batch2.md'), '- Unverified: RLS');
    expect(checkBatchVerification(root, true).blocking.join('\n')).toContain('Unverified');
  });

  it('warns but does not block in default mode', () => {
    const root = fixture();
    writeFileSync(
      join(root, 'docs/status/batch2.verify.json'),
      JSON.stringify({ verified: false }),
    );
    const report = checkBatchVerification(root, false);
    expect(report.blocking).toEqual([]);
    expect(report.warning.join('\n')).toContain('unverified');
  });
});

// This file must run under both tsx and node --experimental-strip-types.
// Keep it free of enums, namespaces, parameter properties, and decorators.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type ReleaseReport = { blocking: string[]; warning: string[]; ok: string[] };
type CheckOptions = {
  root?: string;
  production?: boolean;
  trackedFiles?: string[];
  runMobileGuard?: () => { status: number | null; output: string };
};

type BatchVerification = {
  schema_version: number;
  batch: string;
  verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  commands_run: string[];
  notes?: string;
};

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const requiredRunbooks = [
  'README.md',
  'refund.md',
  'chargeback-dispute.md',
  'webhook-replay.md',
  'reconciliation.md',
  'failed-deletion.md',
  'backup-restore.md',
  'incident-response.md',
];
const legalDrafts = ['terms-of-service.md', 'privacy-policy.md', 'dsar.md', 'dpa-notes.md'];

function add(report: ReleaseReport, kind: 'blocking' | 'warning' | 'ok', message: string) {
  report[kind].push(message);
}
function trackedFilesAt(projectRoot: string) {
  try {
    return execFileSync('git', ['ls-files', '-z'], { cwd: projectRoot, encoding: 'utf8' })
      .split('\0')
      .filter(Boolean);
  } catch {
    return [];
  }
}
function defaultMobileGuard(projectRoot: string) {
  const result = spawnSync(
    process.execPath,
    [join(projectRoot, 'scripts/check-mobile-no-payments.mjs')],
    { cwd: projectRoot, encoding: 'utf8' },
  );
  return { status: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}
function looksLikeSecret(value: string) {
  return /(?:eyJ[a-zA-Z0-9_-]{20,}|(?:sk|rk|sb_secret|service_role)[_-][a-zA-Z0-9_-]{12,}|[a-zA-Z0-9+/=_-]{40,})/.test(
    value,
  );
}

function checkEnvExample(report: ReleaseReport, projectRoot: string) {
  const path = join(projectRoot, '.env.example');
  if (!existsSync(path)) {
    add(report, 'blocking', '.env.example is missing.');
    return;
  }
  for (const [index, line] of readFileSync(path, 'utf8').split(/\r?\n/).entries()) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, name, rawValue] = match;
    const value = rawValue.trim().replace(/^['"]|['"]$/g, '');
    if (
      /(KEY|SECRET|TOKEN|PASSWORD|SERVICE_ROLE|WEBHOOK)/i.test(name) &&
      value &&
      looksLikeSecret(value)
    )
      add(
        report,
        'blocking',
        `.env.example contains a real-looking secret at line ${index + 1} (${name}).`,
      );
  }
  add(report, 'ok', '.env.example contains no real-looking secret values.');
}

export function checkBatchVerification(projectRoot: string, production: boolean): ReleaseReport {
  const report: ReleaseReport = { blocking: [], warning: [], ok: [] };
  const recordPath = join(projectRoot, 'docs/status/batch2.verify.json');
  const statusPath = join(projectRoot, 'docs/status/batch2.md');
  if (!existsSync(recordPath)) {
    const message = 'Batch 2 verification record is missing: docs/status/batch2.verify.json.';
    add(report, production ? 'blocking' : 'warning', message);
    return report;
  }
  let record: BatchVerification;
  try {
    record = JSON.parse(readFileSync(recordPath, 'utf8')) as BatchVerification;
  } catch {
    add(
      report,
      production ? 'blocking' : 'warning',
      'Batch 2 verification record is invalid JSON.',
    );
    return report;
  }
  if (!record.verified) {
    add(
      report,
      production ? 'blocking' : 'warning',
      'Batch 2 is unverified; see docs/status/batch2.verify.json.',
    );
  } else if (!production) add(report, 'ok', 'Batch 2 verification record is marked verified.');
  if (production && record.verified) {
    const verifiedAt = record.verified_at ? Date.parse(record.verified_at) : Number.NaN;
    if (Number.isNaN(verifiedAt) || Date.now() - verifiedAt > 30 * 86_400_000)
      add(
        report,
        'blocking',
        'Batch 2 verification is stale or has no valid verified_at timestamp.',
      );
    if (
      !Array.isArray(record.commands_run) ||
      !record.commands_run.every((command) => typeof command === 'string')
    )
      add(report, 'blocking', 'Batch 2 verification has invalid commands_run data.');
    else if (!record.commands_run.length)
      add(report, 'blocking', 'Batch 2 verification has no commands recorded.');
    else if (!record.commands_run.includes('pnpm db:reset && pnpm db:seed && pnpm test'))
      add(
        report,
        'blocking',
        'Batch 2 verification does not record the required database test sequence.',
      );
  }
  if (production) {
    if (!existsSync(statusPath)) add(report, 'blocking', 'Batch 2 status document is missing.');
    else if (/^\s*-\s*Unverified:/im.test(readFileSync(statusPath, 'utf8')))
      add(report, 'blocking', 'Batch 2 status still contains an Unverified: item.');
    else add(report, 'ok', 'Batch 2 status agrees with the verification record.');
  }
  return report;
}

export function evaluateRelease(options: CheckOptions = {}): ReleaseReport {
  const projectRoot = options.root ?? root;
  const production = options.production ?? false;
  const report: ReleaseReport = { blocking: [], warning: [], ok: [] };
  const batchReport = checkBatchVerification(projectRoot, production);
  report.blocking.push(...batchReport.blocking);
  report.warning.push(...batchReport.warning);
  report.ok.push(...batchReport.ok);
  const mobileGuard = options.runMobileGuard ?? (() => defaultMobileGuard(projectRoot));
  const tracked = options.trackedFiles ?? trackedFilesAt(projectRoot);
  const appPath = join(projectRoot, 'apps/mobile/app.json');
  for (const guardFile of ['scripts/check-mobile-no-payments.mjs', 'packages/shared/flags.ts']) {
    if (production && !existsSync(join(projectRoot, guardFile)))
      add(report, 'blocking', `Required mobile guard file is missing: ${guardFile}.`);
  }
  if (existsSync(appPath)) {
    const app = JSON.parse(readFileSync(appPath, 'utf8')) as {
      expo?: {
        extra?: { eas?: { projectId?: string } };
        ios?: { bundleIdentifier?: string };
        android?: { package?: string };
      };
    };
    if (production && app.expo?.extra?.eas?.projectId?.startsWith('REPLACE_'))
      add(report, 'blocking', 'Set the EAS project ID.');
    if (production && !app.expo?.ios?.bundleIdentifier)
      add(report, 'blocking', 'Set the iOS bundle identifier.');
    if (production && !app.expo?.android?.package)
      add(report, 'blocking', 'Set the Android package identifier.');
  } else add(report, 'blocking', 'Mobile app configuration is missing.');

  for (const file of requiredRunbooks) {
    const path = join(projectRoot, 'docs/runbooks', file);
    if (!existsSync(path))
      add(report, 'blocking', `Required runbook is missing: docs/runbooks/${file}.`);
    else if (production) {
      const tokens = readFileSync(path, 'utf8').match(/\[PLACEHOLDER[^\]]*\]/gi) ?? [];
      if (tokens.some((token) => !/(entity|contact|effective date|legal entity name)/i.test(token)))
        add(
          report,
          'blocking',
          `Runbook contains a disallowed placeholder: docs/runbooks/${file}.`,
        );
    }
  }
  if (requiredRunbooks.every((file) => existsSync(join(projectRoot, 'docs/runbooks', file))))
    add(report, 'ok', 'All required runbooks exist and contain no disallowed placeholders.');
  for (const file of legalDrafts)
    if (!existsSync(join(projectRoot, 'docs/legal', file)))
      add(report, 'blocking', `Legal draft is missing: docs/legal/${file}.`);
  if (legalDrafts.every((file) => existsSync(join(projectRoot, 'docs/legal', file))))
    add(report, 'ok', 'Required legal drafts exist.');

  if (production) {
    const checklistPath = join(projectRoot, 'docs/release-checklist.md');
    if (!existsSync(checklistPath))
      add(report, 'blocking', 'docs/release-checklist.md is missing.');
    else if (/- \[ \]/.test(readFileSync(checklistPath, 'utf8')))
      add(report, 'blocking', 'docs/release-checklist.md contains unchecked boxes.');
    else add(report, 'ok', 'Release checklist has no unchecked boxes.');
    const matrixPath = join(projectRoot, 'docs/security/rls-matrix.md');
    if (!existsSync(matrixPath)) add(report, 'blocking', 'docs/security/rls-matrix.md is missing.');
    else if (/\bVERIFY\b/.test(readFileSync(matrixPath, 'utf8')))
      add(report, 'blocking', 'docs/security/rls-matrix.md contains VERIFY cells.');
    else add(report, 'ok', 'RLS matrix has no VERIFY cells.');
    const readmePath = join(projectRoot, 'README.md');
    const environmentsPath = join(projectRoot, 'docs/environments.md');
    const documentation = `${existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : ''}${existsSync(environmentsPath) ? readFileSync(environmentsPath, 'utf8') : ''}`;
    if (
      /PAYMENTS_LIVE_ENABLED\s*=\s*false/.test(documentation) &&
      /leave|disabled|deliberately|remain/i.test(documentation)
    )
      add(report, 'ok', 'PAYMENTS_LIVE_ENABLED=false is documented as the deliberate safe state.');
    else
      add(
        report,
        'blocking',
        'PAYMENTS_LIVE_ENABLED must be documented as deliberately disabled or explicitly reviewed.',
      );
  } else add(report, 'warning', 'Production-only documentation completeness checks were not run.');

  const committedEnv = tracked.filter(
    (file) => /(^|\/)\.env(?:\.|$)/.test(file) && !/(^|\/)\.env\.example$/.test(file),
  );
  if (committedEnv.length)
    add(report, 'blocking', `Committed environment files found: ${committedEnv.join(', ')}.`);
  else add(report, 'ok', 'No committed .env files found.');
  checkEnvExample(report, projectRoot);
  const guard = mobileGuard();
  if (guard.status !== 0)
    add(
      report,
      'blocking',
      `Mobile payment guard failed: ${guard.output.trim() || 'unknown error'}`,
    );
  else add(report, 'ok', 'Mobile payment guard passed.');
  const shared = readFileSync(join(projectRoot, 'packages/shared/src/index.ts'), 'utf8');
  if (/MOBILE_IAP_ENABLED\s*=\s*false\s+as const/.test(shared))
    add(report, 'ok', 'MOBILE_IAP_ENABLED is false.');
  else add(report, 'blocking', 'MOBILE_IAP_ENABLED is not explicitly false.');
  return report;
}

export function formatReport(report: ReleaseReport) {
  const section = (title: string, entries: string[]) =>
    [`${title}:`, ...(entries.length ? entries.map((entry) => `- ${entry}`) : ['- none'])].join(
      '\n',
    );
  return [
    section('BLOCKING', report.blocking),
    section('WARNING', report.warning),
    section('OK', report.ok),
  ].join('\n\n');
}

if (process.argv[1]?.endsWith('release-check.ts')) {
  const report = evaluateRelease({ production: process.argv.includes('--production') });
  console.log(formatReport(report));
  if (report.blocking.length) process.exit(1);
}

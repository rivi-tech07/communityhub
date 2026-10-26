import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Map(
  process.argv.slice(2).flatMap((argument) => {
    const separator = argument.indexOf('=');
    return separator === -1
      ? [[argument.replace(/^--/, ''), 'true']]
      : [[argument.slice(2, separator), argument.slice(separator + 1)]];
  }),
);

if (args.get('batch') !== 'batch2') throw new Error('Only --batch=batch2 is supported.');
if (!args.get('by')) throw new Error('--by=<name> is required.');
if (!args.get('confirm-db-passed'))
  throw new Error('Pass --confirm-db-passed only after the database verification commands pass.');
if (process.env.CI === 'true')
  throw new Error('Verification cannot be recorded automatically in CI.');

const commands = (args.get('commands') ?? '')
  .split(';')
  .map((command) => command.trim())
  .filter(Boolean);
if (!commands.length) throw new Error('--commands="<command>;<command>" is required.');

const record = {
  schema_version: 1,
  batch: 'batch2',
  verified: true,
  verified_at: new Date().toISOString(),
  verified_by: args.get('by'),
  commands_run: commands,
  notes: 'Verified manually against a disposable Supabase environment.',
};
writeFileSync(
  resolve(root, 'docs/status/batch2.verify.json'),
  `${JSON.stringify(record, null, 2)}\n`,
  'utf8',
);
console.log('Batch 2 verification record updated.');

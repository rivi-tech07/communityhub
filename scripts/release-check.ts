import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = JSON.parse(readFileSync(resolve(root, 'apps/mobile/app.json'), 'utf8')) as {
  expo: {
    extra?: { eas?: { projectId?: string } };
    ios?: { bundleIdentifier?: string };
    android?: { package?: string };
  };
};
const production = process.argv.includes('--production');
const failures: string[] = [];
if (production && app.expo.extra?.eas?.projectId?.startsWith('REPLACE_'))
  failures.push('Set the EAS project ID.');
if (production && !app.expo.ios?.bundleIdentifier) failures.push('Set the iOS bundle identifier.');
if (production && !app.expo.android?.package) failures.push('Set the Android package identifier.');
if (production && process.env.PAYMENTS_LIVE_ENABLED !== 'true')
  failures.push(
    'Production payment release requires an explicit reviewed PAYMENTS_LIVE_ENABLED=true.',
  );
if (!existsSync(resolve(root, 'docs/release-checklist.md')))
  failures.push('Release checklist is missing.');
if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}
console.log(
  production ? 'Production release contract passed.' : 'Development release contract passed.',
);

import { readFile, writeFile } from 'node:fs/promises';

const mobilePackagePath = 'apps/mobile/package.json';
const mobileAppPath = 'apps/mobile/app.json';

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) throw new Error(`Invalid mobile package version: ${version}`);
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function buildNumberForVersion(version) {
  const { major, minor, patch } = parseVersion(version);
  const buildNumber = major * 1_000_000 + minor * 1_000 + patch;
  if (buildNumber > 2_147_483_647) throw new Error('Derived mobile build number is too large.');
  return buildNumber;
}

const mobilePackage = JSON.parse(await readFile(mobilePackagePath, 'utf8'));
const app = JSON.parse(await readFile(mobileAppPath, 'utf8'));
const version = mobilePackage.version;
const buildNumber = buildNumberForVersion(version);

app.expo ??= {};
app.expo.version = version;
app.expo.ios ??= {};
app.expo.android ??= {};
app.expo.ios.buildNumber = String(buildNumber);
app.expo.android.versionCode = buildNumber;

await writeFile(mobileAppPath, `${JSON.stringify(app, null, 2)}\n`);
console.log(`Synced mobile app version ${version} and build ${buildNumber}.`);

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectories = [
  'apps/web/.next',
  'apps/web/out',
  'apps/mobile/dist',
  'apps/mobile/.expo',
];
const clientEnvFiles = ['apps/web/.env.local', 'apps/mobile/.env'];
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const serviceRolePrefix = /sb_secret_[A-Za-z0-9_-]+/g;
const jwtCandidate = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g;
const serviceRoleEnvName = /(?:^|\n)\s*(?:export\s+)?SUPABASE_SERVICE_ROLE_KEY\s*=/;

function filesUnder(pathname) {
  if (!existsSync(pathname)) return [];
  const info = statSync(pathname);
  if (info.isFile()) return /\.(?:js|map)$/.test(pathname) ? [pathname] : [];
  const files = [];
  for (const entry of readdirSync(pathname)) {
    const child = join(pathname, entry);
    if (statSync(child).isDirectory()) files.push(...filesUnder(child));
    else if (/\.(?:js|map)$/.test(child)) files.push(child);
  }
  return files;
}

function decodePayload(candidate) {
  const payload = candidate.split('.')[1];
  if (!payload) return '';
  try {
    return Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split('\n').length;
}

function findHits(content) {
  const hits = [];
  if (serviceRoleKey && content.includes(serviceRoleKey))
    hits.push(content.indexOf(serviceRoleKey));
  for (const match of content.matchAll(serviceRolePrefix)) hits.push(match.index);
  for (const match of content.matchAll(jwtCandidate)) {
    const payload = decodePayload(match[0]);
    if (/(?:"role"\s*:\s*"service_role"|role\s*:\s*service_role)/.test(payload))
      hits.push(match.index);
  }
  return [...new Set(hits)].sort((a, b) => a - b);
}

const targets = [
  ...outputDirectories.flatMap((directory) => filesUnder(resolve(root, directory))),
  ...clientEnvFiles.map((file) => resolve(root, file)).filter((file) => existsSync(file)),
];
const findings = [];

for (const pathname of targets) {
  const content = readFileSync(pathname, 'utf8');
  const isClientEnv = clientEnvFiles.some((file) => resolve(root, file) === pathname);
  const hits = findHits(content);
  const envMatch = isClientEnv ? serviceRoleEnvName.exec(content) : null;
  if (envMatch) hits.unshift(envMatch.index);
  for (const hit of [...new Set(hits)])
    findings.push(`${relative(root, pathname)}:${lineNumberAt(content, hit)}`);
}

if (findings.length) {
  console.error('Service-role credential leak detected:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log('No Supabase service-role credentials found in client outputs or client env files.');

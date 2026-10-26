import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('apps/mobile');
const ignored = new Set(['node_modules', '.git', '.tsbuild']);
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.map']);
const paymentImport =
  /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)(['"])(?:stripe|@stripe\/[^'"]+|react-native-iap)\1/;
const violations = [];

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && !ignored.has(entry.name))
      await scan(path.join(directory, entry.name));
    if (!entry.isFile() || !sourceExtensions.has(path.extname(entry.name))) continue;
    const file = path.join(directory, entry.name);
    await scanFile(file);
  }
}

async function scanFile(file) {
  const lines = (await readFile(file, 'utf8')).split(/\r?\n/);
  lines.forEach((line, index) => {
    if (paymentImport.test(line))
      violations.push(`${path.relative(process.cwd(), file)}:${index + 1}`);
  });
}

await scan(root);
if (violations.length) {
  console.error('Mobile payment SDK imports are forbidden in production builds:');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}
console.log('Mobile payment SDK import check passed.');

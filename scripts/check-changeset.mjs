import { execFileSync } from 'node:child_process';

const baseRef = process.env.GITHUB_BASE_REF;
const headRef = process.env.GITHUB_SHA || 'HEAD';

if (!baseRef) {
  console.log('Changeset PR check skipped outside a pull request.');
  process.exit(0);
}

const changedFiles = execFileSync(
  'git',
  ['diff', '--name-only', `origin/${baseRef}...${headRef}`],
  {
    encoding: 'utf8',
  },
)
  .split(/\r?\n/)
  .filter(Boolean);
const requiresChangeset = changedFiles.some(
  (file) => file.startsWith('packages/shared/') || file.startsWith('supabase/migrations/'),
);
if (!requiresChangeset) {
  console.log('No shared package or Supabase migration changes require a changeset.');
  process.exit(0);
}

const hasChangeset = changedFiles.some(
  (file) => file.startsWith('.changeset/') && file.endsWith('.md') && !file.endsWith('README.md'),
);
if (!hasChangeset) {
  console.error(
    'This PR changes packages/shared or supabase/migrations. Add a .changeset/*.md file.',
  );
  process.exit(1);
}
console.log('Changeset found for shared or Supabase migration changes.');

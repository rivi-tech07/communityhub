# Contributing

## Branches and pull requests

- Work from a short-lived branch named `codex/<topic>` or `feature/<topic>`; do not push directly to `main`.
- Keep each pull request focused on one concern and describe migrations, configuration changes, security impact, and known blockers.
- Never commit secrets, service-role keys, payment secrets, webhook secrets, or real customer data.
- Do not weaken RLS or enable live payments without an explicit review and documented approval.

## Required checks

Run these checks before requesting review, in this order:

```text
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build:web
pnpm check:leaks
pnpm test
pnpm release:check
```

If a check is blocked by missing local infrastructure or credentials, report the exact command, reason, and required setup in the pull request.

## Maintenance

- Dependabot groups routine pnpm and GitHub Actions updates weekly. Review the
  security-only lane immediately and do not merge a known high/critical advisory
  without an approved, expiring exception.
- Run `pnpm prepare` after cloning to enable the local gitleaks pre-commit hook;
  install gitleaks separately before committing. CI remains the authoritative
  secret scan.
- Keep `.semgrep.yml`, CodeQL findings, and the dependency audit gate green.
  Security-rule changes need a focused PR and a test or documented false-positive
  rationale.
- Release SBOMs are generated automatically by the release workflow. Do not
  hand-edit or commit generated SBOM artifacts.
- Review the active list in
  `docs/security/dependency-audit-exceptions.md` during every release. Remove
  expired exceptions rather than extending them silently.

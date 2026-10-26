# Security policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately to `security@example.com` (placeholder — replace before public launch). Do not open a public issue containing exploit details or secrets. Include the affected version, reproduction steps, impact, and any relevant logs with personal data removed.

## Supported versions

Only the latest release on the default branch is currently supported. Older deployments should be upgraded before requesting security support.

## Scope

In scope: the web and mobile clients, server routes, Supabase policies and migrations, authentication, authorization, payment/webhook handling, file uploads, and release configuration. Do not include third-party provider outages, social engineering, or vulnerabilities in dependencies without a reproducible CommunityHub impact.

## Automated security controls

- Dependabot groups routine pnpm and GitHub Actions updates weekly. GitHub
  security updates are kept in a separate security-only lane and should open as
  soon as an advisory is available; do not delay them for the weekly batch.
- Gitleaks runs in CI and in the tracked `.githooks/pre-commit` hook. Run
  `pnpm prepare` once after cloning, then install gitleaks locally. The hook
  scans staged content only and fails closed if gitleaks is unavailable.
- CodeQL analyzes JavaScript/TypeScript on pushes, pull requests, and weekly.
- Semgrep runs `.semgrep.yml`, checking secret-like literals, service-role JWT
  material, `eval`/`Function`, and server-secret environment access in client
  paths. Server-only service-role access is outside the client rule.
- Release publications generate a CycloneDX JSON SBOM as both a workflow
  artifact and release asset.
- CI runs `pnpm audit:high`; high and critical findings block the job. The only
  permitted exceptions are time-limited entries in
  `docs/security/dependency-audit-exceptions.md`.

These controls do not replace RLS review, secret rotation, provider-console
review, or the release checklist. Never add service-role, payment, webhook, or
provider credentials to client environment variables.

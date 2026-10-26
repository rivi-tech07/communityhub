## Summary

<!-- What changed and why? -->

## Checks

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm format:check`
- [ ] `pnpm build:web`
- [ ] `pnpm check:leaks`
- [ ] `pnpm test`
- [ ] `pnpm release:check`

## Safety checklist

- [ ] No secrets or service-role keys are included.
- [ ] RLS is unchanged or protected by a new migration and denial-path test.
- [ ] Payment live mode remains disabled.
- [ ] Migrations, configuration, docs, and blockers are described above.

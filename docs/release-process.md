# Release process

CommunityHub uses [Changesets](https://github.com/changesets/changesets) to
version the releaseable workspace packages:

- `@communityhub/web`
- `@communityhub/mobile`
- `@communityhub/shared`

## During development

1. Make the code and tests change.
2. Run `pnpm changeset` and select every affected package. Choose the smallest
   correct release type and describe the user-visible or operational impact.
3. A pull request touching `packages/shared` or `supabase/migrations` must
   include a non-README `.changeset/*.md` file. Other PRs should add one when
   they change a releaseable package or behavior.
4. Keep migrations, security policy changes, and their tests in the same PR.

The CI changeset check compares the pull request with its base branch. It does
not require a changeset for documentation-only or unrelated application
changes.

## Preparing a version

After the required changesets are merged or while preparing a release branch,
run:

```sh
pnpm release:version
```

This runs `changeset version`, updates the selected workspace `package.json`
versions and changelogs, refreshes the lockfile, and synchronizes
`apps/mobile/app.json` from `apps/mobile/package.json`.

The synchronization writes:

- `expo.version` from the mobile package version;
- `expo.ios.buildNumber` as a deterministic integer derived from
  `major.minor.patch` (`major * 1,000,000 + minor * 1,000 + patch`);
- `expo.android.versionCode` to the same integer.

EAS uses `appVersionSource: local`, so the checked-in app metadata is the
source for the store version and build number. If a version exceeds the mobile
build-number limit, the script fails rather than silently truncating it.

Review the generated changes, run the full checks, and commit the version bump
and consumed changesets together. Do not edit generated versions or build
numbers manually.

## Production release gate

Before tagging or submitting a build, run:

```sh
pnpm release:check -- --production
```

Changesets do not replace this gate. The production check still requires the
release checklist, legal/security documentation, RLS matrix resolution,
mobile payment guard, deliberate `PAYMENTS_LIVE_ENABLED=false` documentation,
and the other configured release controls. Resolve every blocking result
before release; warnings require an owner and a release-ticket decision.

The production build must use the exact versioned commit produced by
`pnpm release:version`. Verify the web package version, mobile package/app
version, iOS build number, Android version code, migration state, and deployment
environment in the release ticket.

## CI and publishing

CI checks the pending changeset requirement on pull requests. The normal CI
workflow remains responsible for typecheck, lint, formatting, build, security
scans, tests, and `release:check`. Publishing a release is intentionally a
separate maintainer action after review and production approvals; no payment
live-mode setting is enabled by this process.

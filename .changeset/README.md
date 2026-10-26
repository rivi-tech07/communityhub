# Changesets

Add one Markdown changeset for every user-visible or release-relevant change.
Use `pnpm changeset` to create one, select the affected workspace packages, and
choose `patch`, `minor`, or `major` deliberately. Do not edit generated package
versions by hand; run `pnpm release:version` to consume pending changesets.

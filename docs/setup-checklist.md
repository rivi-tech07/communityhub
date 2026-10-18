# CommunityHub Setup Checklist

Start with development essentials. Payment and store accounts can be activated later.

## Development tools

- [ ] Install Node.js LTS and Git
- [ ] Install VS Code or use your preferred Codex environment
- [ ] Create an Expo account
- [ ] Create a GitHub repository for CommunityHub

## Backend and storage

- [ ] Create a Supabase project
- [x] Configure database migrations in `supabase/migrations`
- [x] Define storage buckets and Row Level Security policies
- [ ] Configure separate development, staging, and production environment variables
- [ ] Configure backups/PITR and complete a restore drill before production

## Authentication

- [ ] Configure email verification and password recovery in Supabase Auth
- [ ] Choose an SMS OTP provider, such as Twilio
- [ ] Add provider credentials to secure server-side configuration
- [ ] Test OTP delivery, expiry, resend cooldowns, and provider rate limiting

## Release and payments

- [ ] Register an Apple Developer account when ready to publish
- [ ] Register a Google Play Console developer account when ready to publish
- [ ] Set up eligible UK and India merchant payment accounts
- [ ] Configure payment sandbox keys and webhook endpoints
- [ ] Verify refunds, reconciliation, compliance, and incident procedures

## References

- Copy variable names from `.env.example`; never commit real secrets.
- Follow `docs/environments.md` for environment separation.
- Follow `docs/release-checklist.md` before any store submission.
- Use `pnpm db:reset`, `pnpm db:seed`, and `pnpm test` for local development.

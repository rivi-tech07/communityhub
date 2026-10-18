# Environment and deployment configuration

## Development

Use local Supabase/Docker, `APP_ENV=development`, test payment keys only, and `PAYMENTS_LIVE_ENABLED=false`. Seed only disposable accounts. Never copy a staging or production service-role key into `.env`.

## Staging

Use a separate Supabase project and storage bucket. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, payment sandbox keys/webhook secrets, provider callback URLs, error-reporting DSN, and EAS `staging` channel through a secret manager. Use the reviewer account template only with disposable users.

## Production

Use a third Supabase project, restricted service-role access, private buckets, database backups/PITR, monitoring, alerting, WAF/API rate limiting, payment merchant approvals, verified refund workflow, and signed release artifacts. Set `PAYMENTS_LIVE_ENABLED=true` only after the release checklist is approved. Client bundles may contain only public Supabase URL/key and non-sensitive environment flags.

## Web deployment

The Next.js dashboard is configured for Vercel in `apps/web/vercel.json`. Configure the project root, environment variables per environment, preview protection, custom domain, HTTPS, webhook routes, deployment logs, and rollback to the prior immutable deployment. Do not expose `SUPABASE_SERVICE_ROLE_KEY` or payment secrets to `NEXT_PUBLIC_*` variables.

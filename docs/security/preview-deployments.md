# Preview deployment security

CommunityHub previews are not production environments. Every Vercel preview must be protected before it is shared and must use a Supabase branch or disposable preview project. Preview variables must never point at the production Supabase project, production storage buckets, live payment credentials, or production webhook endpoints.

## Vercel settings

For the CommunityHub Vercel project:

1. Open **Settings → Deployment Protection**.
2. Turn on **Vercel Authentication** for Preview deployments.
3. If the plan exposes **Password Protection**, turn it on for Preview deployments and set a separate team password.
4. Keep **Protection Bypass for Automation** off unless a specific CI integration requires it; never share a bypass secret with reviewers.
5. Do not enable a public preview exception or allow anonymous access to preview URLs.
6. In **Settings → Environment Variables**, scope preview values to **Preview** only and set:
   - `NEXT_PUBLIC_SUPABASE_URL` to the Supabase branch/preview project URL.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy anon key) from that same preview project.
   - `SUPABASE_SERVICE_ROLE_KEY` only as a server-side Preview variable when a protected server route requires it; never prefix it with `NEXT_PUBLIC_`.
   - Test payment credentials and test webhook secrets only, with `PAYMENTS_LIVE_ENABLED=false`.
7. In Supabase, configure the preview project’s Site URL and redirect URLs for the Vercel preview domain, and keep production URLs out of the preview project.

The application adds security headers to every route. A non-development build with missing public Supabase variables renders a neutral **Unavailable** page rather than exposing a partially configured app. Local development may show the `Development mode` banner; that banner is not rendered by preview or production builds.

Before sharing a preview, confirm the deployment protection prompt appears in a private browser window and verify that the preview can read only the preview Supabase data.

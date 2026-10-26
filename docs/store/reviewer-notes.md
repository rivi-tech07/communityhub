# Reviewer notes

> **Draft reviewer-facing notes.** Create the demo account in staging immediately before review. No credential value belongs in this repository.

## What CommunityHub does

CommunityHub is a community platform with public and private communities, moderated social posts, a business directory and catalog, jobs and applications, services, events, profiles, settings, and delivery-oriented operational views. Users can browse public content, sign in for protected actions, manage their profile, and request account deletion from Settings.

The web app also contains catalog, order, and delivery workflows. Live payment activation is intentionally controlled separately and must remain disabled until the payment release gates are approved.

## Intentionally unavailable

- **Paid promotions and boosts in the mobile app:** the UI is intentionally absent while `MOBILE_IAP_ENABLED=false`. Apple Guideline 3.1.1 and Google Play Billing require compliant in-app purchase implementations for digital promotions consumed in the app. See [Mobile IAP deferral](iap-deferral.md).
- **Live payments:** `PAYMENTS_LIVE_ENABLED=false` is the safe release state. Do not describe a live purchase as available in the reviewer account.
- **SMS OTP:** the app can request SMS OTP through Supabase, but delivery depends on the configured provider. Do not promise SMS delivery unless the staging provider is enabled and tested.
- **Unverified businesses:** anonymous users see only permitted public/verified content. A staging reviewer should use an approved seeded business if catalog review is required.

## How to reach the screens

The web routes below are the current review paths:

| Area                   | Path                 | Review action                                                                            |
| ---------------------- | -------------------- | ---------------------------------------------------------------------------------------- |
| Authentication         | `/login`             | Sign in with the staging reviewer account; email/password is the primary path.           |
| Home/public browsing   | `/`                  | Review the public landing and navigation.                                                |
| Community              | `/community`         | Browse public community content; sign in before protected posting or moderation actions. |
| Businesses and catalog | `/businesses`        | Browse approved businesses and products.                                                 |
| Jobs                   | `/jobs`              | Search jobs, open a detail page, and begin an application where staging data allows it.  |
| Applications           | `/jobs/applications` | Review the signed-in user's application list and statuses.                               |
| Services               | `/services`          | Browse service listings and submit an enquiry when enabled in staging.                   |
| Events                 | `/events`            | Browse events and register or cancel where enabled in staging.                           |
| Profile                | `/profile`           | Review profile details and profile customization.                                        |
| Settings               | `/settings`          | Review privacy controls, account actions, and deletion request flow.                     |
| Privacy and terms      | `/privacy`, `/terms` | Open the public policy pages.                                                            |
| Rider operations       | `/rider`             | Use only with a staging account explicitly assigned the rider role.                      |

The mobile app opens on authentication. After sign-in it presents the authenticated home/profile flow; SMS is optional and must not be used as the only reviewer path unless the staging SMS provider is ready.

## Demo account specification

- Create the account in the staging Supabase project only.
- Store the approved email/password or other reviewer details outside the repository under the secret name `COMMUNITYHUB_REVIEWER_ACCOUNT`.
- Confirm the email before submission; do not require an OTP provider unless the review instructions explicitly cover it.
- Seed non-sensitive demo data for one public community, one private-community membership, approved catalog content, a job, a service, and an event.
- Do not use a real person's personal data, live payment credentials, production orders, or production customer records.
- If admin, business-owner, or rider-only screens need review, create separate least-privilege staging accounts and reference their secret names in the private submission record; do not share elevated credentials in this file.

## Review boundaries

The reviewer can browse public content without signing in and can use the staging account for protected actions. The app should show a clear sign-in prompt rather than exposing private content. Mobile purchase UI must not be shown; the detailed rationale and enablement requirements are in [iap-deferral.md](iap-deferral.md).

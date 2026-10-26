# ADR-0006: Mobile IAP deferral

## Context

Paid promotions and boosts are digital features in the mobile app. Apple and
Google require their respective in-app purchase systems for those digital
transactions, but StoreKit/Play Billing, receipt validation, restore handling,
and review configuration are not implemented.

## Decision

Keep mobile promotion purchases disabled. `MOBILE_IAP_ENABLED` remains `false`,
purchase entry points are not rendered, and the app shows only the neutral
availability message. Web promotions remain governed by their own server-side
feature flags and payment controls.

## Consequences

- The mobile app does not expose an incomplete purchase flow to reviewers or
  users.
- Enabling the flag requires implementing and testing both store billing paths,
  server receipt verification, restore/refund handling, and store review.
- No mobile payment SDK dependency is added while the feature is dormant.

## Alternatives

- Use Stripe or Razorpay inside the mobile app: rejected for digital promotion
  purchases because it conflicts with store billing requirements.
- Show disabled purchase buttons: rejected because it still exposes an
  incomplete purchase surface.

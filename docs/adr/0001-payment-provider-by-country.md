# ADR-0001: Payment provider selection by country

## Context

CommunityHub serves merchants in more than one market. The payment layer
supports Stripe and Razorpay, and provider credentials and webhook secrets are
configured separately for the merchant country (`PAYMENT_PROVIDER_GB` and
`PAYMENT_PROVIDER_IN`).

## Decision

Select the approved provider from the merchant country configuration on the
server. The client never selects a provider or receives provider secrets.
Payment mode remains test-only while `PAYMENTS_LIVE_ENABLED=false`.

## Consequences

- Provider-specific order, signature, refund, and webhook handling stays behind
  the server payment adapter.
- Credentials, webhook verification, and country configuration must be present
  before a payment flow can proceed.
- Currency and provider configuration must be reviewed per market before launch.

## Alternatives

- Use one global provider: rejected because it does not match the supported
  country configuration or provider availability.
- Let the client choose: rejected because it would weaken authorization and
  expose business/payment configuration.

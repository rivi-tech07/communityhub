# ADR-0002: No split seller payouts

## Context

The shop model can contain multiple businesses, but the current payment and
order schema does not implement marketplace settlement or provider connected
accounts. Mobile promotion purchases are also intentionally disabled.

## Decision

Do not implement split seller payouts. Orders and payment transactions remain
under platform-controlled state transitions, with provider settlement handled
outside the client. Any future marketplace settlement requires a separate
review, provider capability assessment, and ADR.

## Consequences

- The app cannot claim automated multi-seller settlement.
- Checkout must fail closed when required payment configuration is absent.
- Reconciliation and refunds operate against the platform transaction record,
  not client-supplied seller allocations.

## Alternatives

- Add provider connected accounts now: rejected because onboarding, KYC,
  settlement, tax, and dispute handling are not implemented.
- Simulate seller balances in the client: rejected because it would create an
  inaccurate money state and a security risk.

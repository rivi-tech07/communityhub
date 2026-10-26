# Store screenshots

Use clean, production-like staging data. Do not capture real personal data, credentials, internal URLs, debug banners, stack traces, or provider dashboards.

## Device matrix

### iOS

- iPhone 6.7-inch display.
- iPhone 6.5-inch display.
- iPhone 5.5-inch display.
- iPad 12.9-inch display if tablet support is included in the submitted listing.

Verify the current App Store Connect screenshot dimensions before capture and record the exact pixel dimensions with the release artifact.

### Android

- A current Play Console accepted phone portrait size and aspect ratio.
- 7-inch and 10-inch tablet captures only if the submitted listing supports tablets.

Verify the current Play Console requirements before capture; do not assume a historical pixel-size rule.

## Required scenes

Capture the smallest set that explains the real product:

1. Authentication and the verified sign-in path.
2. Public community browsing.
3. Business directory and catalog browsing.
4. Jobs search/detail and the application flow.
5. Services and event browsing.
6. Profile and settings, including the account deletion entry point.
7. A neutral unavailable state where a reviewer needs to understand a disabled capability.

## No purchase UI visible

Mobile screenshots must not show prices, buy buttons, boost buttons, paywalls, or “coming soon” purchase placeholders. With `MOBILE_IAP_ENABLED=false`, the app should show only the informational row “Promotions are not available in the app.” where that capability would otherwise be described. See [Mobile IAP deferral](../iap-deferral.md).

Do not crop the informational state into a purchase-like call to action. Verify the final screenshots against the mobile payment guard before submission.

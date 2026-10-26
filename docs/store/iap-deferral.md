# Mobile promotion purchase deferral

Mobile promotion and boost purchases are not available. The shared flag is deliberately set to:

```ts
MOBILE_IAP_ENABLED = false;
```

When the flag is false, the mobile app renders only: “Promotions are not available in the app.” It does not show prices, purchase buttons, boost controls, or tappable purchase placeholders.

## Why this is deferred

Apple App Review Guideline 3.1.1 requires digital features, boosts, and promotions consumed in an iOS app to use In-App Purchase. Google Play generally requires Google Play Billing for digital in-app features. Web Stripe/Razorpay checkout is not a substitute for mobile digital-purchase compliance.

## Before enabling

The owner must complete StoreKit and Google Play Billing integration, product configuration and review, receipt/token verification on the server, restore purchases, refunds, entitlement expiry, account/device handling, regional policy review, and store submission testing. No IAP dependency is included until that work is ready.

The production EAS build also runs `pnpm check:mobile-no-payments`, which fails if mobile source imports Stripe, `@stripe/*`, or `react-native-iap`.

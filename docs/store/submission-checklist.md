# Store submission checklist

> **Draft operational checklist.** Complete and verify every item against the final build and the current Apple/Google submission forms. Do not commit reviewer credentials or signing secrets.

## Shared release controls

- [ ] Submit only a staging/demo environment that is isolated from production data, or the approved production environment after the release gate is signed off.
- [ ] Confirm `MOBILE_IAP_ENABLED=false`; mobile paid promotion and boost purchase UI must not appear. See [Mobile IAP deferral](iap-deferral.md).
- [ ] Confirm `PAYMENTS_LIVE_ENABLED=false` unless the payment release has separately passed the required provider, legal, and operational approvals.
- [ ] Confirm the privacy labels draft matches the final data flows: [Privacy labels](privacy-labels.md).
- [ ] Create reviewer access in staging outside the repository. Store the approved account details in the deployment secret named `COMMUNITYHUB_REVIEWER_ACCOUNT`.
- [ ] Remove real personal data, debug banners, stack traces, test keys, and internal URLs from screenshots and reviewer notes.

## iOS / App Store

### Build and signing

- [ ] Confirm version and build number in the final EAS artifact. The current app version is `0.1.0`; production EAS is configured to auto-increment builds.
- [ ] Confirm bundle identifier `com.communityhub.app`.
- [ ] Set the real App Store Connect app identifier; the repository currently contains `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` in `apps/mobile/eas.json`.
- [ ] Verify Apple Developer team, distribution certificate, provisioning profile, App Store Connect access, and TestFlight processing.
- [ ] Verify production EAS credentials and signing are held in EAS/Apple secret storage, not in the repository.

### Listing and review material

- [ ] Capture final screenshots for iPhone 6.7-inch, 6.5-inch, and 5.5-inch displays; include iPad 12.9-inch captures if tablet support is submitted.
- [ ] Cover login, community, business/catalog browsing, jobs/application flow, services, events, profile/settings, and account deletion.
- [ ] Do not show mobile purchase buttons, prices, boosts, or promotional purchase placeholders.
- [ ] Complete the App Store age-rating questionnaire from the final content and moderation configuration; do not infer a rating from this checklist.
- [ ] Answer export-compliance questions from the actual release cryptography and networking. Supabase HTTPS/TLS alone does not determine every export answer; confirm with the current Apple form and legal owner.
- [ ] Verify the in-app account deletion path is reachable from Settings and that the public privacy policy link works.
- [ ] Add reviewer instructions and the staging demo account to App Store Connect using `COMMUNITYHUB_REVIEWER_ACCOUNT`; never place the credential value in this repository.

## Android / Google Play

### Build and signing

- [ ] Confirm `versionName` and `versionCode` in the final EAS artifact. Production EAS has `autoIncrement: true`; record the resulting values in the release ticket.
- [ ] Confirm package name `com.communityhub.app`.
- [ ] Complete Play App Signing and upload-key setup; keep keystores and passwords in Google/EAS secret storage only.
- [ ] Verify the production EAS profile and internal-test artifact before promoting to a closed or production track.

### Listing and review material

- [ ] Capture phone screenshots at the current Play Console accepted dimensions and aspect ratios; record the exact pixel dimensions in the release ticket.
- [ ] Capture 7-inch and 10-inch tablet screenshots only if tablet support is included in the submitted listing; verify the current Play Console requirements before upload.
- [ ] Complete the Play content-rating questionnaire from the final app behavior.
- [ ] Complete Data safety from the final flows and [Privacy labels](privacy-labels.md); every claim must be supported by code.
- [ ] Provide a public account-deletion web resource and verify it works without an authenticated session if required by the current Play policy. The authenticated Settings deletion flow exists, but a public deletion resource is **NOT YET IMPLEMENTED — blocks submission** until verified.
- [ ] Add reviewer instructions and the staging demo account using `COMMUNITYHUB_REVIEWER_ACCOUNT`; do not commit the credential value.

## Final sign-off

- [ ] Review [Reviewer notes](reviewer-notes.md).
- [ ] Review the [Screenshot capture guide](screenshots/README.md).
- [ ] Review [Mobile IAP deferral](iap-deferral.md) and confirm no purchase UI is visible.
- [ ] Complete `docs/release-checklist.md`, including signing, isolated environments, backups, monitoring, legal review, and store approvals.
- [ ] Confirm the final artifact contains no service-role keys, payment secrets, webhook secrets, or placeholder credentials.

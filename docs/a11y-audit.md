# Accessibility audit

Audit scope: the web login/admin shell and the mobile login/onboarding shell.
The visual language remains unchanged; fixes are limited to contrast, focus,
semantics, motion, and touch interaction.

## Fixed

- Increased muted and eyebrow text contrast and added explicit glass-surface
  and focus-ring tokens for light and dark themes.
- Added visible `:focus-visible` rings for links, controls, and form fields.
- Added a reduced-motion media query that removes non-essential transitions and
  animation timing for users who request less motion.
- Kept web login labels associated with their fields and associated live error
  and status messages with the form through `aria-describedby`.
- Added tab semantics and selected state to the web email/phone switcher.
- Added React Native accessibility labels and hints for email, phone, password,
  and SMS code fields, plus polite/assertive announcement regions for status and
  errors.
- Raised mobile auth controls and links to at least 44pt touch targets; the
  primary action is at least 48pt.
- Added axe-core scanning to the admin-shell Playwright suite. Serious and
  critical violations fail the test; lower-impact findings remain visible in
  the generated axe result for follow-up.

## Keyboard and modal review

No modal or dialog component exists in the audited web admin/login or mobile
login/onboarding shell, so there was no active keyboard trap to repair. Future
dialogs must use a real dialog semantics, move focus inside on open, contain
Tab/Shift+Tab, close on Escape where appropriate, and restore focus to the
trigger.

## Remaining work

- Run the axe scan against every authenticated web surface, not only the admin
  shell required for this pass.
- Audit the larger mobile home, shop-owner, and rider workspaces on physical
  devices with VoiceOver and TalkBack.
- Review dynamic community and business content for heading order, alt text,
  loading announcements, and keyboard interaction.
- Verify contrast again after any future theme or accent-token changes.

## Local verification

Install the Playwright browser and run `pnpm e2e:web` with the disposable
Supabase E2E credentials described in `docs/setup-checklist.md`. The CI job
fails on serious or critical axe violations in the admin shell.

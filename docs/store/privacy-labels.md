# Store privacy labels — DRAFT

**DRAFT — App Store Connect and Google Play submissions require review against the final production configuration.** Each claim below includes the code path that supports it.

## Apple App Privacy draft

| Data type                      | Proposed use / linked to user                        | Code path evidence                                                                                 | Status                                                        |
| ------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Contact info: email, phone     | Account/authentication                               | `apps/web/app/login/auth-client.tsx`, Supabase Auth                                                | Supported by code; classify with Apple’s final questionnaire  |
| Name, city, country, biography | App functionality/community                          | `profiles`, `apps/web/app/api/profile/route.ts`                                                    | Supported by code                                             |
| User content                   | Community, jobs, orders, services, events            | `posts`, `comments`, `job_applications`, `orders`, `service_requests`, `event_registrations`       | Supported by code                                             |
| Photos/videos/files            | Profile, post, business/product, CV, delivery proofs | `profile-media`, `community-media`, `business-media`, `private-documents`, `delivery-proofs` paths | Supported by code; classify sensitivity/access accurately     |
| Purchase/payment info          | Payment processing references, not card numbers      | `payment_transactions`, `apps/web/lib/payments.ts`                                                 | Supported by code; Stripe/Razorpay handle payment credentials |
| Precise location               | Delivery proof coordinates                           | `delivery_proofs.latitude`, `delivery_proofs.longitude`                                            | Supported by schema; confirm runtime collection disclosure    |
| Diagnostics/analytics          | **NOT YET IMPLEMENTED — blocks submission**          | No approved analytics inventory in repository                                                      | Do not claim collection until implemented and inventoried     |

Tracking across apps and advertising use are **NOT YET IMPLEMENTED — blocks submission** unless separately implemented and reviewed. Supabase Auth confirmation, recovery, and OTP are provider-managed; the app does not claim to deliver them through its application outbox.

## Google Play Data Safety draft

| Category                           | Proposed answer                                                                              | Code path evidence                                                | Status                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| Personal info                      | Collected: email, phone, name, address/profile fields                                        | Auth/profile/order schemas and routes                             | Draft; verify exact Play categories                          |
| Photos and videos / files and docs | Collected when user uploads profile, community, business, CV, or delivery proof files        | Storage buckets and upload routes listed above                    | Draft; verify retention and optionality                      |
| Location                           | Collected for delivery proof coordinates when the delivery flow uses them                    | `delivery_proofs` migration and rider proof route                 | Draft; verify foreground/background behavior                 |
| Financial info                     | Payment data is processed by Stripe/Razorpay; app stores transaction references and statuses | `payment_transactions`, payment provider client                   | Draft; verify provider configuration and disclosure          |
| App activity / diagnostics         | **NOT YET IMPLEMENTED — blocks submission**                                                  | No approved analytics/diagnostics inventory                       | Do not claim collection                                      |
| Security practices                 | Encryption in transit/at rest and deletion handling                                          | Supabase/Vercel configuration and `scripts/process-deletions.mjs` | **[PLACEHOLDER: verify provider controls and Play answers]** |

Final labels must be completed from the production environment, enabled processors, storage regions, retention schedule, and store questionnaires. These drafts are not a submission approval.

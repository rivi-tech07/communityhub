# CommunityHub Privacy Policy — DRAFT

**DRAFT — NOT FOR PUBLICATION.** This document requires review by a qualified privacy professional and approval by the controller before publication.

- Controller/entity: **[PLACEHOLDER: legal entity name]**
- Jurisdiction and supervisory authority: **[PLACEHOLDER: jurisdiction and authority]**
- Privacy contact: **[PLACEHOLDER: privacy contact/email]**
- Effective date: **[PLACEHOLDER: effective date]**

## Data we collect

| Data                                                                               | Why it is used                               | Code path / record                                                                                                     |
| ---------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Email, phone, password authentication metadata                                     | Account creation, sign-in, recovery, and OTP | `apps/web/app/login/auth-client.tsx`; Supabase Auth                                                                    |
| Display name, biography, city, country, language, privacy settings                 | Profile and community features               | `profiles`; `apps/web/app/api/profile/route.ts`                                                                        |
| Posts, comments, likes, saves, reports, blocks, moderation records                 | Community operation and safety               | `posts`, `comments`, `post_likes`, `saved_posts`, `reports`, `blocks`, `moderation_audit_log`                          |
| Business, product, catalogue, image, job, CV, service, event, and application data | Marketplace, jobs, services, and events      | Tables in `supabase/migrations/202610180004_business_catalog_delivery.sql` and `202610180005_jobs_services_events.sql` |
| Orders, payment references, provider event payloads, refund state                  | Physical goods and payment reconciliation    | `orders`, `order_items`, `payment_transactions`, `payment_events`                                                      |
| Delivery address, rider assignment, timestamps, and proof media                    | Delivery operations and dispute handling     | `delivery_runs`, `delivery_run_stops`, `delivery_proofs`; `apps/web/app/api/delivery/`                                 |
| Upload metadata and private storage paths                                          | Secure file access and deletion              | `cv_documents`, `post_media`, `business_images`, `product_images`; storage buckets                                     |
| Diagnostics and operational logs                                                   | Security, reliability, and incident response | **NOT YET IMPLEMENTED — blocks submission** where a specific analytics/diagnostics inventory is required               |

## Purposes and lawful bases

The final controller must select and document the lawful basis for each purpose. Candidate purposes include contract performance for requested account/marketplace services, legal obligation for accounting and safety records, legitimate interests for security and abuse prevention, and consent where required for optional communications or cookies. This mapping is **NOT YET IMPLEMENTED — blocks submission** until approved for the chosen jurisdiction.

## Processors

Expected processors include Supabase (database, Auth, Storage), Vercel (hosting), Stripe and Razorpay (payment processing when enabled), and configured email/SMS providers for application notifications. Provider identity, region, DPA status, and transfer mechanism are tracked in [DPA notes](dpa-notes.md). Supabase Auth confirmation, recovery, and OTP delivery remain Supabase-managed; application notifications use the server outbox.

## Retention and rights

Retention, deletion, anonymisation, and permanent audit exceptions are described in [data retention](../data/retention.md). The proposed rights process covers access/export, correction, deletion, restriction, objection, portability where applicable, and complaints. Response identity checks, exemptions, fees, and statutory deadlines require approval: **NOT YET IMPLEMENTED — blocks submission**.

## Children, transfers, and cookies

- Children’s data: age threshold, parental consent, safeguarding, and age-assurance process are **NOT YET IMPLEMENTED — blocks submission**.
- International transfers: hosting/provider locations and approved transfer safeguards are **NOT YET IMPLEMENTED — blocks submission**.
- Cookies/local storage: the app uses authentication/session storage and appearance preferences. A complete cookie inventory, consent mechanism, and opt-out controls are **NOT YET IMPLEMENTED — blocks submission**.

## Contact

Contact **[PLACEHOLDER: privacy contact/email]** for privacy questions or a request. This draft is not legal advice and must not be published as the final notice.

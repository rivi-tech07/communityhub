# Feature flags

Feature flags keep designed-but-disabled surfaces dormant without requiring a
redeploy. The resolver applies one precedence order: environment variable,
then the service-role-only database override, then the typed default. Values
are cached for the lifetime of a request.

## Registry

| Key                 | Environment variable        | Default                  | Disabled behavior                                                 |
| ------------------- | --------------------------- | ------------------------ | ----------------------------------------------------------------- |
| `checkout`          | `FEATURE_CHECKOUT`          | off in every environment | Checkout API returns HTTP 501 and the checkout UI is not rendered |
| `promotions`        | `FEATURE_PROMOTIONS`        | off in every environment | Promotion API returns HTTP 501 and no promotion CTA is shown      |
| `service_enquiries` | `FEATURE_SERVICE_ENQUIRIES` | off in every environment | Enquiry API returns HTTP 501 and no enquiry CTA is shown          |
| `jobs`              | `FEATURE_JOBS`              | on in every environment  | Existing jobs surface remains available                           |
| `shop`              | `FEATURE_SHOP`              | on in every environment  | Existing shop browsing remains available                          |
| `delivery`          | `FEATURE_DELIVERY`          | off in every environment | Delivery operations remain unavailable                            |
| `community_posts`   | `FEATURE_COMMUNITY_POSTS`   | on in every environment  | Existing community posting remains available                      |

The exact disabled response is:

```json
{
  "error": { "code": "FEATURE_DISABLED", "message": "This feature is not available yet." },
  "feature": "checkout"
}
```

The server-only administrator route `PATCH /api/admin/features` updates a
database override and writes a `moderation_audit_log` entry. The feature flag
table has no anon or authenticated policies and must only be accessed by the
service role. Do not put service-role credentials in client environment
variables.

## Safe rollout

1. Keep the flag off while migrations and the complete flow are being tested.
2. Apply the feature-flag migration to the intended Supabase environment.
3. Set an environment override only for a controlled environment, or use the
   administrator route for an audited database override.
4. Verify the API response, UI entry point, authorization, and rollback path.
5. Turn the flag off immediately if the flow is not healthy; no redeploy is
   required.

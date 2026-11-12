# Implementation status — 12 November 2026

## Implemented in this increment
- Rebranded project metadata and specification to DIGITAL AI SUPPLIER.
- OTP challenge and server session persistence models.
- OTP request and verification endpoints with hashed codes, expiry, attempt cap and basic resend throttling.
- OTP delivery fails closed unless a provider endpoint and secret are configured.
- Signed HTTP-only session cookie and server-side session lookup.
- Tenant helper derives tenant scope from the authenticated session.
- Seller self-registration endpoint: verifies OTP, creates a tenant, seller account and FREE/TRIAL subscription in one database transaction; public registration cannot assign OWNER_ADMIN.
- Seller login, registration and logout screens/endpoints.
- Seller dashboard with tenant-scoped product listing and product creation API.
- Tenant-scoped language preference endpoint and browser preference.

## Not yet implemented / not yet verified
- Owner bootstrap, owner MFA, protected owner console, recovery and logout-all-devices UI.
- Provider-specific SMS/email adapter and real delivery tests.
- Tenant-isolation integration tests, CSRF/rate-limit hardening and full security test suite.
- Marketplace live API integrations, payments/webhooks, AI providers, supplier settlements and production deployment.
- No production database or third-party credentials have been connected.
- Build/typecheck/database migration must be run in an environment with dependencies and a configured PostgreSQL database.

## Important
The presence of a module in the product specification or dashboard does not mean it is operational. External integrations require official access, credentials, user approval and testing. Never expose public self-registration for the OWNER_ADMIN role.

## V6 update — Owner Admin dashboard

- Added `/owner` read-only platform overview for the single configured owner.
- Added server-side authorization requiring a valid active session, `OWNER_ADMIN` role, and exact `OWNER_ADMIN_EMAIL` match.
- Added protected overview API with seller/workspace/product/order counts, subscription-state counts, and latest 100 seller workspaces.
- Added environment example and owner provisioning safety notes. No public owner registration is provided.
- Not yet implemented: payment ledger, 8% commission calculations/settlement, subscription mutation, seller suspension, and admin audit workflows. These must be implemented with transactional records and audited server-side controls.
- Validation: source files and ZIP packaging completed. A full TypeScript/build/database integration test was not run in this environment.


## V7 — 8% commission ledger (source added)
- Added a per-order commission ledger for delivered orders at 8% (800 basis points).
- Added owner-only APIs to generate missing entries, inspect aggregate totals, and record manual settlements with payment references.
- Added audit log records for ledger generation and paid status changes.
- Added commission summary and latest-entry table to the owner dashboard.
- Database migration and Prisma Client regeneration are required before running this version.
- No payment gateway, automatic money transfer, refund/reversal workflow, or production test has been completed.

## V8 — subscription administration
- Added owner-only subscription list and controls for manual activation/renewal, 3/7/14-day grace periods, suspension and cancellation.
- Activation requires a non-empty payment reference and records it on the subscription; this is explicitly a manual verification workflow, not an online payment gateway.
- Every subscription change creates owner audit records. The API validates plan, duration, grace period and reason fields.
- Added subscription payment reference and update timestamp to the Prisma schema. A database migration is required before deployment.
- Important remaining work: integrate a payment provider with signed webhooks, set real plan prices, enforce subscription access centrally across all seller APIs/pages, and test expiry/grace-period behavior before production.


## V9 — Subscription expiry enforcement
- Added configurable grace-period deadline (`gracePeriodEndsAt`) and migration.
- Expired ACTIVE subscriptions transition to GRACE_PERIOD; expired grace periods transition to SUSPENDED.
- Added seller-readable subscription status endpoint.
- Product APIs block paid product operations when subscription is suspended/cancelled.
- Audit events are recorded for automatic transitions.
- Enforcement is request-triggered; no cron scheduler or gateway webhook is configured yet.

## V10 — Owner-managed subscription pricing
- Added an Owner Admin-managed subscription plan catalogue for STARTER, GROWTH, and BUSINESS.
- Owner can manually edit each plan's monthly INR price; every change is audit-logged.
- New activations/renewals use the current configured price and save a price snapshot on the subscription. Existing subscriptions retain their recorded price when the catalogue price changes.
- A paid plan cannot be activated while its price is zero or the plan is inactive.
- Added Prisma migration `20261112071000_manual_subscription_pricing`.
- This remains manual price configuration and manual payment-reference verification; no payment gateway or automatic collection is connected.


## V11 — background subscription expiry scheduler
- Added authenticated cron endpoint at `/api/cron/subscriptions` to process ACTIVE and GRACE_PERIOD subscriptions in paginated batches.
- Added daily scheduled invocation (`15 0 * * *`, UTC) in `vercel.json`; host must support cron and have `SUBSCRIPTION_CRON_SECRET` configured.
- Improved expiry transition concurrency with conditional updates, audit logs only when a state transition actually occurs, and grace end anchored to the original subscription expiry.
- Cron run totals are audit-logged. Product API remains guarded; other paid seller routes must use the shared billing check when added.
- Not yet verified against a live PostgreSQL database or hosting cron. Full build/typecheck and integration tests remain required.

## V12 – Central seller subscription security
- Added `requirePaidTenantAccess` and preferred `requirePaidTenantUser` server helpers.
- Product listing and creation now use the same central auth + subscription gate.
- Seller dashboard reads subscription state, displays grace/suspension messaging, and disables product creation when access is blocked.
- Account billing/status, language, login and logout routes remain available for recovery.
- Documented mandatory guard usage for all future paid modules.
- Remaining: apply guard as each additional seller module is implemented; test all routes against ACTIVE, TRIAL, GRACE_PERIOD, SUSPENDED and CANCELLED states in a configured database.

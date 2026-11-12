# DIGITAL AI SUPPLIER

Multilingual AI-powered commerce and supplier SaaS foundation.

## Stack
- Next.js 15 / React 19 / TypeScript
- PostgreSQL + Prisma ORM
- Signed HTTP-only session cookie (JOSE)
- OTP challenge hashing and rate limiting

## Current implementation milestone
- Existing multilingual dashboard shell and brand assets
- PostgreSQL tenant/user/product/order/store/marketplace/subscription/audit models
- OTP request + verify API routes (fail closed if delivery provider is not configured)
- Hashed OTP challenges, five-minute expiry, five verification attempts, request throttling
- Signed session cookie and server-side session record
- Tenant ID derived from authenticated session in tenant data helpers
- Seller language preference persistence endpoint and browser preference

## Setup
1. Install Node.js 20+ and PostgreSQL.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`, `SESSION_SECRET` (32+ chars), `OTP_HASH_SECRET` (32+ chars), and a real OTP provider endpoint/key.
3. Run `npm install`.
4. Run `npm run db:generate`.
5. Run `npm run db:migrate` and create the first owner/seller account through a controlled onboarding process.
6. Run `npm run dev`.

## OTP provider contract
`OTP_PROVIDER_URL` must accept an authenticated JSON POST with `{ to, code, expiresInMinutes }`. Configure a provider adapter matching your SMS/email vendor. If the provider is absent or fails, the request is rejected; there is no development OTP bypass.

## Security notes
- Never commit `.env` or real credentials.
- Do not expose Prisma or database access to the browser.
- Use `requireTenantUser()` and tenant-scoped queries for every seller data operation. Never trust a tenant ID supplied by a client.
- Marketplace and payment integrations are not live until official credentials, approvals, webhook verification and connector-specific tests are complete.
- This is a development foundation, not a production-ready service. Registration, owner bootstrap/MFA, recovery, logout/revocation UI, provider-specific OTP adapter, complete tests, monitoring and deployment hardening remain required.

See `docs/MASTER_SPECIFICATION.md` for the complete agreed scope and `docs/IMPLEMENTATION_STATUS.md` for status.

## Owner Admin access (V6)

The private read-only owner dashboard is available at `/owner`. Access requires all of the following:

1. A valid authenticated session.
2. The user's database role is `OWNER_ADMIN`.
3. The user's email exactly matches `OWNER_ADMIN_EMAIL` in the server environment.
4. The account is active.

Set `OWNER_ADMIN_EMAIL` in the deployment environment. Create the owner user through a trusted, private provisioning process and assign `OWNER_ADMIN` directly in the database. Never expose public owner registration or put owner credentials in client-side code. The dashboard displays platform counts, subscription-state counts, the latest 100 tenant workspaces, and the V7 commission ledger. Commission entries can be generated for delivered orders and manually marked paid with a payment reference; automatic transfers are not enabled.


## V7 — commission ledger

- Platform commission is currently fixed at **8%** (800 basis points).
- The owner can generate ledger entries for orders whose status is `DELIVERED`. Duplicate entries are prevented by a unique order relation.
- Each entry stores gross order amount, platform commission, seller net amount, status, payment reference and settlement timestamp. Amounts use PostgreSQL `Decimal` fields and are rounded to two decimal places.
- The owner can mark a pending entry as paid only after making the real transfer separately and entering its genuine bank/UPI reference. This action is audit-logged.
- This is not a payment gateway and does not transfer money. Refund handling, commission reversals, tax treatment, automated payouts and gateway webhooks still need implementation and review.

After setting `DATABASE_URL`, apply the schema change and regenerate Prisma Client:

```bash
npx prisma migrate dev --name commission_ledger
npx prisma generate
```

For production, create and deploy a reviewed migration with `npx prisma migrate deploy`.

## V8 — subscription administration
The owner page `/owner` now includes manual subscription activation/renewal, grace-period, suspension and cancellation controls. Activation is allowed only after an administrator independently verifies the real bank/UPI payment and enters its transaction reference. This does not accept online payments or automatically transfer funds. Plan pricing is intentionally not hard-coded until approved.

After updating the schema, create and apply a migration:

```bash
npx prisma migrate dev --name subscription_payment_reference
npx prisma generate
```

Do not deploy until payment-provider webhooks, central seller-feature access enforcement, and expiry/grace-period tests are implemented and reviewed.

### Owner-managed subscription prices (V10)
The Owner Admin subscription panel allows manual monthly price changes for Starter, Growth, and Business plans. Price changes are audit-logged and apply only to future activations/renewals; each existing subscription retains its saved monthly price snapshot. Set a price above ₹0 before activating a paid plan. Apply the new Prisma migration before deploying:

```bash
npx prisma migrate deploy
npx prisma generate
```

Online payment collection is not included; verify bank/UPI payments independently before entering a transaction reference and activating a seller.


### V11 — scheduled subscription expiry enforcement
- Added a protected `/api/cron/subscriptions` endpoint. It scans all ACTIVE and GRACE_PERIOD subscriptions in cursor-paginated batches and applies expiry transitions even when a seller does not log in.
- Added `vercel.json` with a daily 00:15 UTC schedule. Hosting must support scheduled HTTP jobs; configure `SUBSCRIPTION_CRON_SECRET` as a long random secret in the hosting environment. The scheduler must send `Authorization: Bearer <SUBSCRIPTION_CRON_SECRET>`.
- Grace-period end is calculated from the original subscription expiry date, not the time a cron/request happens to notice it. Conditional database updates prevent duplicate transition audit events when a cron run and seller request overlap.
- Cron executions are audit-logged with scan and transition counts. The endpoint returns 401 without the secret.
- Daily cron means an expiry transition can occur up to roughly 24 hours after its exact deadline; configure a more frequent schedule on a hosting plan that supports it if near-real-time enforcement is required.
- The cron endpoint does not itself replace paid-feature guards. Every seller API/page that provides paid functionality must call the shared subscription access check before serving protected operations. At present the product API has this guard; remaining seller modules must adopt it as they are implemented.

Deploy steps: apply all pending Prisma migrations with `npx prisma migrate deploy`, regenerate Prisma Client with `npx prisma generate`, set `SUBSCRIPTION_CRON_SECRET` in hosting, and configure the cron schedule. Verify using a test tenant with an expired `currentPeriodEnd` and another with an expired `gracePeriodEndsAt`; confirm the first enters GRACE_PERIOD and the second becomes SUSPENDED.

## Central subscription security (V12)

All paid seller API routes and server-side business services must call
`requirePaidTenantUser()` from `src/lib/billing/subscription.ts` before accessing
or changing tenant data. This helper authenticates the seller, derives the tenant
from the server session, refreshes expiry/grace transitions, and rejects blocked
subscriptions with `SUBSCRIPTION_SUSPENDED`. Never trust a tenant ID supplied
by a browser request. Account login/logout, language preferences, and the
subscription-status endpoint remain accessible so a seller can recover access.

The seller dashboard reads `/api/account/subscription`, displays grace/suspension
messages, and disables product creation when paid access is blocked. The products
API independently enforces the same server-side gate; hiding a button is not a
security boundary. New modules (orders, marketplace sync, AI tools, storefront,
reports, supplier tools) must use this guard before any paid operation.


## Version consolidation

See `docs/VERSION_MERGE_REPORT_MR.md` for the V1–V12 comparison, merge decisions, and remaining production requirements.

## V13 — Website test package

V13 adds the public landing site, seller login/register UI, seller product workspace, owner panels, missing OTP request/verify API handlers, a database health endpoint, and a baseline PostgreSQL migration that includes the current schema and subscription plan catalogue. The earlier incremental migration files were consolidated into the baseline so a fresh database can be initialized with `npm run db:deploy`.

### Quick start
See `docs/FINAL_SETUP_MR.md` for Marathi setup instructions. Required commands:

```bash
npm install
npm run db:generate
npm run db:deploy
npm run dev
```

Create a separate verified account for the platform owner, then run `npm run owner:promote -- owner@example.com` from a trusted terminal and set `OWNER_ADMIN_EMAIL` to the same address. Do not promote your normal seller account.

`/api/health` checks PostgreSQL connectivity. `npm run build` and `npm run typecheck` must pass in the target environment before deployment. This package is not certified production-ready: payment and marketplace integrations, provider-specific OTP delivery, MFA, comprehensive tests, and production security review remain outstanding.

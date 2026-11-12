# DIGITAL AI SUPPLIER — Master Specification

This is the consolidated project scope. A requirement listed here is a design commitment, not proof that the feature is implemented or live.

## A. Platform and ownership
- Single secure Owner/Super Admin account, separate from seller accounts.
- Owner has final approval over production releases, payment/security/schema changes and high-impact automation.
- Role-based access, MFA for Owner, protected admin routes, least privilege, audit trail.
- Seller self-registration; independent tenant data and strict server-side tenant isolation.
- Owner analytics: account/subscription status, usage, marketplace connections, product/order counts, AI usage and payment summaries. Sensitive access is minimized and logged.

## B. Identity, login and security
- Mandatory OTP verification for each login; no successful OTP means no access.
- OTP expiry, one-time use, attempt limits, resend throttling, hashed OTP storage, abuse detection, safe account recovery.
- Password + OTP or secure passwordless OTP flow to be selected in implementation.
- OTP provider outage: deny login until a safe verified recovery route is available; never silently bypass OTP.
- New-device/suspicious-login checks, session management, logout-all-devices.
- No plaintext passwords, OTPs, payment card data or UPI PINs in logs/database.
- Encryption in transit/at rest, secret vault, backups, security tests, privacy notice and data retention/deletion controls.

## C. Multilingual / localization
- Language framework from the beginning; seller selects and changes their own language.
- Marathi, Hindi, English, Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam, Punjabi, Urdu, Odia, Assamese, Sanskrit, Nepali, Kashmiri, Konkani, Maithili, Manipuri, Sindhi, Dogri, Bodo plus extensible global language packs.
- Translate navigation, dashboard, settings, notifications, reports, help, storefront and AI conversations where supported.
- Locale-aware dates, numbers, currencies, plural rules and RTL layout for Urdu.
- Fallback language for missing translations; translation review and AI translation quality checks.
- Listing a language in the language selector does not mean its translations are already complete.

## D. Seller profile
Business name, owner/authorized person, email/mobile verification, optional GSTIN, entity type, address/PIN, logo, storefront photos/banner/branding, billing/shipping addresses, alternative contact, preferred language, marketplace details. Collect PAN/GST/bank documents only where legally or operationally required; encrypt and restrict access.

## E. Marketplaces and commerce channels
Target channels: Amazon, Flipkart, Meesho, Shopify, WooCommerce, eBay, Etsy, Walmart and future connectors.
- Per-seller marketplace connections and encrypted credentials.
- Product/listing, orders, inventory, returns/refunds and reporting only to the extent permitted by each official API and account approval.
- CSV/report import fallback where official API access is unavailable.
- Do not scrape or bypass marketplace controls; show connector capability/status honestly.

## F. AI business managers
- Product: discovery, demand/trend research, price comparison, margin estimates, listing copy and media suggestions.
- Sales: daily/weekly/monthly reporting, order status, returns/refunds and recommendations.
- Stock: inventory tracking, low-stock alerts, restock suggestions, stock history and safe multi-channel sync to prevent overselling.
- Marketing: AI-created posts/captions/ads/videos/content calendar and manual upload/edit/schedule/publish; user can combine both modes. Publishing and ad spend require seller approval.
- Customer: chat support, tickets, order questions, returns/refunds, escalation, optional voice support/calling through approved providers; recording/transcripts require notice and consent.
- Finance: revenue, costs, marketplace fees, shipping, taxes, returns, profit/loss, invoices and exports.
- Business analyst: trends, forecasts, channel/product comparisons and recommendations.
- AI may recommend/prepare; customer approval required for consequential seller actions.

## G. Own storefront
Per-seller store branding, catalog, variants, photos/videos, pricing, cost, stock, discounts, SEO, shareable URL/subdomain, cart, checkout, addresses, coupons, payment/COD where supported, order tracking, reviews, returns/refunds. Unify own-store and marketplace orders; sync stock safely. Custom domains are a later configurable decision.

## H. Supplier marketplace and zero-inventory reselling
Supplier onboarding/verification, product catalogue and base price, reseller storefront listings and margin, supplier direct dispatch/dropshipping, stock availability, dispatch SLA, tracking, quality checks, counterfeit controls, returns/refunds, disputes and settlement after delivery/return window per contract. Supplier shipping model, margin rules and commission configurability need final decisions. Zero upfront inventory is not a guarantee of zero operating costs.

## I. Monetization and owner payments
- Subscription plans, payment history, expiry reminders, grace period and paid-feature suspension after grace period; do not immediately delete data for nonpayment.
- Server-side verified payment webhooks; refunds, failures, reconciliation and settlement.
- Owner-only bank/payment settings screen to configure account/gateway after launch; do not collect bank credentials in chat.
- Separate subscription revenue ledger from transaction commission ledger.
- User-requested 8% commission for eligible successful own-store sales; disclose before sale, reverse on qualifying cancellations/refunds. Commission calculation base and whether it applies to reseller/supplier marketplace still need confirmation.
- Sample subscription prices are not final.

## J. Automation, diagnostics and change approval
- Automation manager for order notices, stock alerts, sales reports, subscription reminders, customer notifications and marketing scheduling.
- AI diagnostics and safe predefined remediation; isolated staging, tests, backups and rollback.
- AI must never freely rewrite/deploy production code or alter payment/security/customer data.
- Customer feature requests -> AI analysis -> Owner approve/reject/request details -> staging/tests -> approved release with audit log.

## K. IP and operational controls
Private repository, server-side business logic and secrets, least-privilege developer access, NDA/IP assignment, code review, audit logs, backups, rate limiting, monitoring, trademark/copyright/legal review. Frontend code can be inspected; no 100% anti-copy guarantee.

## L. Delivery acceptance
Each module needs: UI, server-side logic, database migrations, authorization/tenant isolation, error handling, tests, audit events, localization, documentation and staging verification. External providers/API approvals/credentials are prerequisites, not generated by code alone.

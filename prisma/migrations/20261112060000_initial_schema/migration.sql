-- Initial baseline schema for DIGITAL AI SUPPLIER.
CREATE TYPE "UserRole" AS ENUM ('OWNER_ADMIN', 'SELLER', 'STAFF');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED');
CREATE TYPE "Marketplace" AS ENUM ('AMAZON', 'FLIPKART', 'MEESHO', 'SHOPIFY', 'WOOCOMMERCE', 'EBAY', 'ETSY', 'WALMART', 'OTHER');
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAID', 'VOID');
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED');

CREATE TABLE "Tenant" (
  "id" TEXT NOT NULL, "businessName" TEXT NOT NULL, "preferredLanguage" TEXT NOT NULL DEFAULT 'mr', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "User" (
  "id" TEXT NOT NULL, "tenantId" TEXT, "email" TEXT, "phone" TEXT, "passwordHash" TEXT,
  "preferredLanguage" TEXT NOT NULL DEFAULT 'mr', "role" "UserRole" NOT NULL DEFAULT 'SELLER', "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Store" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "currency" TEXT NOT NULL DEFAULT 'INR', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Product" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "sku" TEXT, "price" DECIMAL(12,2) NOT NULL, "stock" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Order" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "orderNumber" TEXT NOT NULL, "status" "OrderStatus" NOT NULL DEFAULT 'PLACED', "total" DECIMAL(12,2) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MarketplaceConnection" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "marketplace" "Marketplace" NOT NULL, "status" TEXT NOT NULL DEFAULT 'NOT_CONNECTED', "encryptedCredentials" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplaceConnection_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL', "planCode" TEXT NOT NULL DEFAULT 'FREE',
  "currentPeriodEnd" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CommissionLedger" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "orderId" TEXT NOT NULL, "grossAmount" DECIMAL(12,2) NOT NULL,
  "commissionRateBps" INTEGER NOT NULL DEFAULT 800, "commissionAmount" DECIMAL(12,2) NOT NULL, "sellerNetAmount" DECIMAL(12,2) NOT NULL,
  "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING', "paymentReference" TEXT, "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "settledAt" TIMESTAMP(3),
  CONSTRAINT "CommissionLedger_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL, "userId" TEXT, "action" TEXT NOT NULL, "entityType" TEXT NOT NULL, "entityId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OtpChallenge" (
  "id" TEXT NOT NULL, "identifier" TEXT NOT NULL, "codeHash" TEXT NOT NULL, "purpose" TEXT NOT NULL DEFAULT 'LOGIN', "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3), "attempts" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UserSession" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");
CREATE UNIQUE INDEX "Order_tenantId_orderNumber_key" ON "Order"("tenantId", "orderNumber");
CREATE INDEX "Order_tenantId_status_createdAt_idx" ON "Order"("tenantId", "status", "createdAt");
CREATE UNIQUE INDEX "MarketplaceConnection_tenantId_marketplace_key" ON "MarketplaceConnection"("tenantId", "marketplace");
CREATE UNIQUE INDEX "Subscription_tenantId_key" ON "Subscription"("tenantId");
CREATE UNIQUE INDEX "CommissionLedger_orderId_key" ON "CommissionLedger"("orderId");
CREATE INDEX "CommissionLedger_tenantId_status_createdAt_idx" ON "CommissionLedger"("tenantId", "status", "createdAt");
CREATE INDEX "CommissionLedger_status_createdAt_idx" ON "CommissionLedger"("status", "createdAt");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "OtpChallenge_identifier_createdAt_idx" ON "OtpChallenge"("identifier", "createdAt");
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");
CREATE INDEX "UserSession_userId_expiresAt_idx" ON "UserSession"("userId", "expiresAt");
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Store" ADD CONSTRAINT "Store_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceConnection" ADD CONSTRAINT "MarketplaceConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD COLUMN "gracePeriodEndsAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "paymentReference" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "priceAtPurchase" DECIMAL(12,2) NOT NULL DEFAULT 0;
CREATE TABLE "SubscriptionPlan" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "displayName" TEXT NOT NULL,
  "monthlyPrice" DECIMAL(12,2) NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");

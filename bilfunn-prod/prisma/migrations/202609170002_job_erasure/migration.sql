ALTER TABLE "Outbox" ADD COLUMN "userId" TEXT;
CREATE INDEX "Outbox_userId_kind_idx" ON "Outbox"("userId", "kind");
CREATE INDEX "Checkout_provider_status_createdAt_idx" ON "Checkout"("provider", "status", "createdAt");

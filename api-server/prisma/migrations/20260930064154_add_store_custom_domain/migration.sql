-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "customDomain" TEXT,
ADD COLUMN     "customDomainStatus" TEXT,
ADD COLUMN     "cloudflareHostnameId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Store_customDomain_key" ON "Store"("customDomain");

/*
  Warnings:

  - A unique constraint covering the columns `[domain]` on the table `Store` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "domain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Store_domain_key" ON "Store"("domain");

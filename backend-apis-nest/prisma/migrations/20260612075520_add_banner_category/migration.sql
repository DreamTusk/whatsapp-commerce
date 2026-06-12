-- AlterEnum
ALTER TYPE "BannerType" ADD VALUE 'CATEGORY';

-- AlterTable
ALTER TABLE "Banner" ADD COLUMN     "categoryId" TEXT;

-- AddForeignKey
ALTER TABLE "Banner" ADD CONSTRAINT "Banner_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

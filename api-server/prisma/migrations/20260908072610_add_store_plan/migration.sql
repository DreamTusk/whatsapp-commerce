-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('BASIC', 'PRO', 'CUSTOM');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'BASIC';

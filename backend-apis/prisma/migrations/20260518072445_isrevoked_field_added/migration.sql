-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "isRevoked" BOOLEAN NOT NULL DEFAULT false;

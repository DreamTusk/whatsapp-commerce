-- Update any existing MANAGER or SALES_EXECUTIVE roles to STAFF before removing them
UPDATE "UserStore" SET "role" = 'STAFF'::"Role" WHERE "role" IN ('MANAGER', 'SALES_EXECUTIVE');
UPDATE "StoreInvite" SET "role" = 'STAFF'::"Role" WHERE "role" IN ('MANAGER', 'SALES_EXECUTIVE');

-- Drop defaults before altering column types
ALTER TABLE "UserStore" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "StoreInvite" ALTER COLUMN "role" DROP DEFAULT;

-- Create new enum without MANAGER and SALES_EXECUTIVE
CREATE TYPE "Role_new" AS ENUM ('OWNER', 'STAFF');

-- Migrate columns to new enum
ALTER TABLE "UserStore" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TABLE "StoreInvite" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");

-- Drop old enum and rename new one
DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

-- Restore defaults
ALTER TABLE "UserStore" ALTER COLUMN "role" SET DEFAULT 'OWNER'::"Role";
ALTER TABLE "StoreInvite" ALTER COLUMN "role" SET DEFAULT 'STAFF'::"Role";

-- Rename EMPLOYEE → STAFF safely (no data loss, existing rows preserved)
ALTER TYPE "Role" RENAME VALUE 'EMPLOYEE' TO 'STAFF';

-- Add isActive to UserStore (default true so existing members stay active)
ALTER TABLE "UserStore" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

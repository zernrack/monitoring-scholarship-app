-- Better Auth Admin plugin fields and the Scholarship Monitoring global role.
ALTER TABLE "user"
  ADD COLUMN "role" TEXT DEFAULT 'student',
  ADD COLUMN "banned" BOOLEAN DEFAULT false,
  ADD COLUMN "banReason" TEXT,
  ADD COLUMN "banExpires" TIMESTAMP(3);

UPDATE "user" SET "role" = 'student' WHERE "role" IS NULL;

ALTER TABLE "session" ADD COLUMN "impersonatedBy" TEXT;

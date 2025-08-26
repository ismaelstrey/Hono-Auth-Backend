-- AlterTable
ALTER TABLE "users" ADD COLUMN "emailVerificationExpires" DATETIME;
ALTER TABLE "users" ADD COLUMN "emailVerificationToken" TEXT;
ALTER TABLE "users" ADD COLUMN "passwordResetExpires" DATETIME;
ALTER TABLE "users" ADD COLUMN "passwordResetToken" TEXT;

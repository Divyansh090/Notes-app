/*
  Warnings:

  - You are about to drop the column `userId` on the `OtpCode` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."OtpCode" DROP CONSTRAINT "OtpCode_userId_fkey";

-- AlterTable
ALTER TABLE "public"."OtpCode" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "password";

-- CreateIndex
CREATE INDEX "OtpCode_email_code_idx" ON "public"."OtpCode"("email", "code");

-- CreateIndex
CREATE INDEX "OtpCode_expires_idx" ON "public"."OtpCode"("expires");

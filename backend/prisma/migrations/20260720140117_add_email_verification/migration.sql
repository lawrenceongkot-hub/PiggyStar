-- CreateTable
CREATE TABLE "EmailVerificationCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "verificationHash" TEXT NOT NULL,
    "verificationPlain" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "EmailVerificationCode_email_status_idx" ON "EmailVerificationCode"("email", "status");

-- CreateIndex
CREATE INDEX "EmailVerificationCode_email_purpose_status_idx" ON "EmailVerificationCode"("email", "purpose", "status");

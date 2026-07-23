/*
  Warnings:

  - You are about to drop the column `isTwoFactorEnabled` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorSecret` on the `Staff` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "lastLogin" DATETIME,
    "lastLoginIp" TEXT,
    "lastLoginDevice" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Staff_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "StaffRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Staff" ("createdAt", "createdBy", "email", "failedLoginAttempts", "id", "lastLogin", "lastLoginDevice", "lastLoginIp", "lockedUntil", "name", "password", "roleId", "status", "updatedAt", "username") SELECT "createdAt", "createdBy", "email", "failedLoginAttempts", "id", "lastLogin", "lastLoginDevice", "lastLoginIp", "lockedUntil", "name", "password", "roleId", "status", "updatedAt", "username" FROM "Staff";
DROP TABLE "Staff";
ALTER TABLE "new_Staff" RENAME TO "Staff";
CREATE UNIQUE INDEX "Staff_username_key" ON "Staff"("username");
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");
CREATE INDEX "Staff_roleId_idx" ON "Staff"("roleId");
CREATE INDEX "Staff_status_idx" ON "Staff"("status");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" DATETIME,
    "mobile" TEXT NOT NULL,
    "mobileVerified" BOOLEAN NOT NULL DEFAULT false,
    "mobileVerifiedAt" DATETIME,
    "fullName" TEXT,
    "usernameUpdatedAt" DATETIME,
    "password" TEXT NOT NULL,
    "referralCode" TEXT,
    "avatar" TEXT,
    "nickname" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "vipLevel" INTEGER NOT NULL DEFAULT 0,
    "mainBalance" REAL NOT NULL DEFAULT 0,
    "bonusBalance" REAL NOT NULL DEFAULT 0,
    "pendingBalance" REAL NOT NULL DEFAULT 0,
    "balance" REAL NOT NULL DEFAULT 0.00,
    "commission" REAL NOT NULL DEFAULT 0.00,
    "totalDeposit" REAL NOT NULL DEFAULT 0.00,
    "totalWithdraw" REAL NOT NULL DEFAULT 0.00,
    "totalBet" REAL NOT NULL DEFAULT 0.00,
    "totalWin" REAL NOT NULL DEFAULT 0.00,
    "validBet" REAL NOT NULL DEFAULT 0.00,
    "rebate" REAL NOT NULL DEFAULT 0.00,
    "bonus" REAL NOT NULL DEFAULT 0.00,
    "points" INTEGER NOT NULL DEFAULT 0,
    "walletLocked" BOOLEAN NOT NULL DEFAULT false,
    "firstDepositBonusClaimed" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" DATETIME,
    "registrationIp" TEXT,
    "registrationDevice" TEXT,
    "lastLoginIp" TEXT,
    "lastLoginDevice" TEXT,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "fraudStatus" TEXT NOT NULL DEFAULT 'CLEAN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatar", "balance", "bonus", "bonusBalance", "commission", "createdAt", "email", "firstDepositBonusClaimed", "fraudStatus", "id", "lastLogin", "lastLoginDevice", "lastLoginIp", "mainBalance", "mobile", "nickname", "password", "pendingBalance", "points", "rebate", "referralCode", "registrationDevice", "registrationIp", "riskScore", "role", "status", "totalBet", "totalDeposit", "totalWin", "totalWithdraw", "updatedAt", "username", "validBet", "vipLevel", "walletLocked") SELECT "avatar", "balance", "bonus", "bonusBalance", "commission", "createdAt", "email", "firstDepositBonusClaimed", "fraudStatus", "id", "lastLogin", "lastLoginDevice", "lastLoginIp", "mainBalance", "mobile", "nickname", "password", "pendingBalance", "points", "rebate", "referralCode", "registrationDevice", "registrationIp", "riskScore", "role", "status", "totalBet", "totalDeposit", "totalWin", "totalWithdraw", "updatedAt", "username", "validBet", "vipLevel", "walletLocked" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

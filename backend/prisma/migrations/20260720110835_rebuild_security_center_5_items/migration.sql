/*
  Warnings:

  - You are about to drop the `FaceVerification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KYC` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `faceVerificationStatus` on the `AccountSecurity` table. All the data in the column will be lost.
  - You are about to drop the column `kycStatus` on the `AccountSecurity` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorEnabled` on the `AccountSecurity` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorEnabled` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorSecret` on the `User` table. All the data in the column will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "FaceVerification";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "KYC";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AccountSecurity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mobileVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "loginPasswordSet" BOOLEAN NOT NULL DEFAULT false,
    "withdrawPasswordSet" BOOLEAN NOT NULL DEFAULT false,
    "bankVerified" BOOLEAN NOT NULL DEFAULT false,
    "securityPercentage" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountSecurity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AccountSecurity" ("bankVerified", "createdAt", "emailVerified", "id", "loginPasswordSet", "mobileVerified", "securityPercentage", "updatedAt", "userId", "withdrawPasswordSet") SELECT "bankVerified", "createdAt", "emailVerified", "id", "loginPasswordSet", "mobileVerified", "securityPercentage", "updatedAt", "userId", "withdrawPasswordSet" FROM "AccountSecurity";
DROP TABLE "AccountSecurity";
ALTER TABLE "new_AccountSecurity" RENAME TO "AccountSecurity";
CREATE UNIQUE INDEX "AccountSecurity_userId_key" ON "AccountSecurity"("userId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL DEFAULT '',
    "username" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" DATETIME,
    "mobile" TEXT,
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
    "vipPoints" INTEGER NOT NULL DEFAULT 0,
    "vipTotalDeposit" REAL NOT NULL DEFAULT 0,
    "vipTotalValidBet" REAL NOT NULL DEFAULT 0,
    "vipTotalTurnover" REAL NOT NULL DEFAULT 0,
    "vipUpdatedAt" DATETIME,
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
INSERT INTO "new_User" ("avatar", "balance", "bonus", "bonusBalance", "commission", "createdAt", "email", "emailVerified", "emailVerifiedAt", "firstDepositBonusClaimed", "fraudStatus", "fullName", "id", "lastLogin", "lastLoginDevice", "lastLoginIp", "mainBalance", "mobile", "mobileVerified", "mobileVerifiedAt", "nickname", "password", "pendingBalance", "points", "rebate", "referralCode", "registrationDevice", "registrationIp", "riskScore", "role", "status", "totalBet", "totalDeposit", "totalWin", "totalWithdraw", "updatedAt", "userId", "username", "usernameUpdatedAt", "validBet", "vipLevel", "vipPoints", "vipTotalDeposit", "vipTotalTurnover", "vipTotalValidBet", "vipUpdatedAt", "walletLocked") SELECT "avatar", "balance", "bonus", "bonusBalance", "commission", "createdAt", "email", "emailVerified", "emailVerifiedAt", "firstDepositBonusClaimed", "fraudStatus", "fullName", "id", "lastLogin", "lastLoginDevice", "lastLoginIp", "mainBalance", "mobile", "mobileVerified", "mobileVerifiedAt", "nickname", "password", "pendingBalance", "points", "rebate", "referralCode", "registrationDevice", "registrationIp", "riskScore", "role", "status", "totalBet", "totalDeposit", "totalWin", "totalWithdraw", "updatedAt", "userId", "username", "usernameUpdatedAt", "validBet", "vipLevel", "vipPoints", "vipTotalDeposit", "vipTotalTurnover", "vipTotalValidBet", "vipUpdatedAt", "walletLocked" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_userId_key" ON "User"("userId");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

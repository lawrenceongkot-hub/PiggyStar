-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL DEFAULT '',
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
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatar", "balance", "bonus", "bonusBalance", "commission", "createdAt", "email", "emailVerified", "emailVerifiedAt", "firstDepositBonusClaimed", "fraudStatus", "fullName", "id", "lastLogin", "lastLoginDevice", "lastLoginIp", "mainBalance", "mobile", "mobileVerified", "mobileVerifiedAt", "nickname", "password", "pendingBalance", "points", "rebate", "referralCode", "registrationDevice", "registrationIp", "riskScore", "role", "status", "totalBet", "totalDeposit", "totalWin", "totalWithdraw", "twoFactorEnabled", "twoFactorSecret", "updatedAt", "username", "usernameUpdatedAt", "validBet", "vipLevel", "vipPoints", "vipTotalDeposit", "vipTotalTurnover", "vipTotalValidBet", "vipUpdatedAt", "walletLocked") SELECT "avatar", "balance", "bonus", "bonusBalance", "commission", "createdAt", "email", "emailVerified", "emailVerifiedAt", "firstDepositBonusClaimed", "fraudStatus", "fullName", "id", "lastLogin", "lastLoginDevice", "lastLoginIp", "mainBalance", "mobile", "mobileVerified", "mobileVerifiedAt", "nickname", "password", "pendingBalance", "points", "rebate", "referralCode", "registrationDevice", "registrationIp", "riskScore", "role", "status", "totalBet", "totalDeposit", "totalWin", "totalWithdraw", "twoFactorEnabled", "twoFactorSecret", "updatedAt", "username", "usernameUpdatedAt", "validBet", "vipLevel", "vipPoints", "vipTotalDeposit", "vipTotalTurnover", "vipTotalValidBet", "vipUpdatedAt", "walletLocked" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_userId_key" ON "User"("userId");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

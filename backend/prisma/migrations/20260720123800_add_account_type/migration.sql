-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WithdrawBank" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountType" TEXT NOT NULL DEFAULT 'BANK',
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WithdrawBank_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WithdrawBank" ("accountName", "accountNumber", "bankName", "createdAt", "id", "isDefault", "status", "updatedAt", "userId") SELECT "accountName", "accountNumber", "bankName", "createdAt", "id", "isDefault", "status", "updatedAt", "userId" FROM "WithdrawBank";
DROP TABLE "WithdrawBank";
ALTER TABLE "new_WithdrawBank" RENAME TO "WithdrawBank";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

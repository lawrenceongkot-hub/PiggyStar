-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL DEFAULT '',
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
CREATE UNIQUE INDEX "Staff_adminId_key" ON "Staff"("adminId");
CREATE UNIQUE INDEX "Staff_username_key" ON "Staff"("username");
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");
CREATE INDEX "Staff_roleId_idx" ON "Staff"("roleId");
CREATE INDEX "Staff_status_idx" ON "Staff"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

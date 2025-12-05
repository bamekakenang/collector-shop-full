-- Redefine User to add address/phone/gender and set active default to false
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "phone" TEXT,
    "gender" TEXT
);

INSERT INTO "new_User" ("id", "name", "email", "password", "role", "active")
  SELECT "id", "name", "email", "password", "role", COALESCE("active", 0) FROM "User";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

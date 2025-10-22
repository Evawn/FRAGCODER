/*
  Warnings:

  - You are about to drop the column `code` on the `Shader` table. All the data in the column will be lost.
  - Added the required column `slug` to the `Shader` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tabs` to the `Shader` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Shader" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tabs" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "compilationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "compilationErrors" TEXT,
    "thumbnail" TEXT,
    "userId" TEXT NOT NULL,
    "forkedFrom" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastSavedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Shader_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Shader" ("createdAt", "description", "forkedFrom", "id", "isPublic", "thumbnail", "title", "updatedAt", "userId") SELECT "createdAt", "description", "forkedFrom", "id", "isPublic", "thumbnail", "title", "updatedAt", "userId" FROM "Shader";
DROP TABLE "Shader";
ALTER TABLE "new_Shader" RENAME TO "Shader";
CREATE UNIQUE INDEX "Shader_slug_key" ON "Shader"("slug");
CREATE INDEX "Shader_userId_idx" ON "Shader"("userId");
CREATE INDEX "Shader_isPublic_idx" ON "Shader"("isPublic");
CREATE INDEX "Shader_slug_idx" ON "Shader"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

/*
  Warnings:

  - You are about to drop the column `yarn` on the `Album` table. All the data in the column will be lost.
  - Added the required column `year` to the `Album` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Artist" (
    "url" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "imageUrl" TEXT
);
INSERT INTO "new_Artist" ("bio", "imageUrl", "name", "url") SELECT "bio", "imageUrl", "name", "url" FROM "Artist";
DROP TABLE "Artist";
ALTER TABLE "new_Artist" RENAME TO "Artist";
CREATE TABLE "new_Album" (
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "rating" DECIMAL NOT NULL,
    "artistUrl" TEXT NOT NULL,
    "imageUrl" TEXT,

    PRIMARY KEY ("artistUrl", "name"),
    CONSTRAINT "Album_artistUrl_fkey" FOREIGN KEY ("artistUrl") REFERENCES "Artist" ("url") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Album" ("artistUrl", "imageUrl", "name", "rating") SELECT "artistUrl", "imageUrl", "name", "rating" FROM "Album";
DROP TABLE "Album";
ALTER TABLE "new_Album" RENAME TO "Album";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

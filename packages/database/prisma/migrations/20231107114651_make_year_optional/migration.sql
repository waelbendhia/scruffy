-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Album" (
    "name" TEXT NOT NULL,
    "year" INTEGER,
    "rating" DECIMAL NOT NULL,
    "artistUrl" TEXT NOT NULL,
    "imageUrl" TEXT,

    PRIMARY KEY ("artistUrl", "name"),
    CONSTRAINT "Album_artistUrl_fkey" FOREIGN KEY ("artistUrl") REFERENCES "Artist" ("url") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Album" ("artistUrl", "imageUrl", "name", "rating", "year") SELECT "artistUrl", "imageUrl", "name", "rating", "year" FROM "Album";
DROP TABLE "Album";
ALTER TABLE "new_Album" RENAME TO "Album";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

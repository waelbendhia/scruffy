-- CreateTable
CREATE TABLE "Correction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "submittedOn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "artistUrl" TEXT,
    "proposedName" TEXT,
    "selectedImageURL" TEXT,
    "proposedBiographyChange" TEXT,
    "albumArtistURL" TEXT,
    "albumName" TEXT,
    "proposedCoverURL" TEXT,
    "proposedReleaseYear" INTEGER,
    "proposedRating" DECIMAL,
    CONSTRAINT "Correction_artistUrl_fkey" FOREIGN KEY ("artistUrl") REFERENCES "Artist" ("url") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Correction_albumArtistURL_albumName_fkey" FOREIGN KEY ("albumArtistURL", "albumName") REFERENCES "Album" ("artistUrl", "name") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UpdateHistory" (
    "checkedOn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hash" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "Artist" (
    "url" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "imageUrl" TEXT,
    "lastUpdated" DATETIME NOT NULL,
    "firstRetrieved" DATETIME NOT NULL,
    "lastRetrieved" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Album" (
    "name" TEXT NOT NULL,
    "year" INTEGER,
    "rating" DECIMAL NOT NULL,
    "artistUrl" TEXT NOT NULL,
    "imageUrl" TEXT,
    "retrieved" DATETIME NOT NULL,

    PRIMARY KEY ("artistUrl", "name"),
    CONSTRAINT "Album_artistUrl_fkey" FOREIGN KEY ("artistUrl") REFERENCES "Artist" ("url") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_RelatedArtists" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_RelatedArtists_A_fkey" FOREIGN KEY ("A") REFERENCES "Artist" ("url") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_RelatedArtists_B_fkey" FOREIGN KEY ("B") REFERENCES "Artist" ("url") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_RelatedArtists_AB_unique" ON "_RelatedArtists"("A", "B");

-- CreateIndex
CREATE INDEX "_RelatedArtists_B_index" ON "_RelatedArtists"("B");

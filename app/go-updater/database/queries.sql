-- name: GetUpdateHistory :one
SELECT
  *
FROM
  "UpdateHistory"
WHERE
  "pageURL" = @pageURL;

-- name: CheckPageExists :one
SELECT
  EXISTS (
    SELECT
      1
    FROM
      "UpdateHistory"
    WHERE
      "hash" = @hash);

-- name: UpsertUpdateHistory :one
INSERT INTO "UpdateHistory" ("checkedOn", "hash", "pageURL")
  VALUES (:checkedOn, :hash, :pageURL)
ON CONFLICT ("pageURL")
  DO UPDATE SET
    "hash" = excluded."hash", "checkedOn" = excluded."checkedOn"
  WHERE
    excluded."hash" != "UpdateHistory"."hash"
  RETURNING
    "checkedOn", "hash", "pageURL";

-- name: UpsertAlbum :exec
INSERT INTO "Album" ("name", "year", "rating", "artistUrl", "imageUrl", "pageURL")
  VALUES (:name, :year, :rating, :artistUrl, :imageUrl, :pageURL)
ON CONFLICT ("artistUrl", "name")
  DO UPDATE SET
    "year" = excluded."year", "rating" = excluded."rating", "imageUrl" = excluded."imageUrl",
      "pageURL" = excluded."pageURL";

-- name: UpsertArtist :exec
INSERT INTO "Artist" ("url", "name", "bio", "imageUrl", "lastModified")
  VALUES (:url, :name, :bio, :imageUrl, DATE('now'))
ON CONFLICT ("url")
  DO UPDATE SET
    "name" = excluded."name", "bio" = excluded."bio", "imageUrl" = excluded."imageUrl",
      "lastModified" = excluded."lastModified";

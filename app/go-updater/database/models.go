// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.20.0

package database

import (
	"database/sql"
	"time"
)

type Album struct {
	Name      string
	Year      sql.NullInt64
	Rating    float64
	Artisturl string
	Imageurl  sql.NullString
	Pageurl   string
}

type Artist struct {
	Url          string
	Name         string
	Bio          sql.NullString
	Imageurl     sql.NullString
	Lastmodified time.Time
}

type RelatedArtists struct {
	A string
	B string
}

type UpdateHistory struct {
	Checkedon time.Time
	Hash      string
	Pageurl   string
}

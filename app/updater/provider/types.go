package provider

type (
	ArtistResult struct {
		ID         string `json:"id"`
		Name       string `json:"name"`
		ImageURL   string `json:"imageURL,omitempty"`
		Confidence int    `json:"confidence"`
	}
	AlbumResult struct {
		ID          string `json:"id"`
		ArtistName  string `json:"artistName"`
		Name        string `json:"name"`
		CoverURL    string `json:"coverURL,omitempty"`
		ReleaseYear int    `json:"releaseYear,omitempty"`
		Confidence  int    `json:"confidence"`
	}
)

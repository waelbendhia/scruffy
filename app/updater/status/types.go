package status

import (
	"time"
)

type UpdateStatus struct {
	IsUpdating bool `json:"isUpdating"`

	UpdateStart time.Time `json:"updateStart,omitempty"`
	UpdateEnd   time.Time `json:"updateEnd,omitempty"`

	Artists int `json:"artists"`
	Albums  int `json:"albums"`
	Pages   int `json:"pages"`

	Errors []string `json:"errors"`
}

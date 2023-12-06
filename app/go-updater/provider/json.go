package provider

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func readRespJSON[T any](resp *http.Response) (*T, error) {
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf(
			"unhandled response status %d with body: %s",
			resp.StatusCode, string(body),
		)
	}

	var res T
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &res, nil
}

package rate

import (
	"context"
	"time"
)

type Limiter struct {
	buf    chan struct{}
	window time.Duration
}

func NewLimiter(rate int, window time.Duration) *Limiter {
	return &Limiter{buf: make(chan struct{}, rate), window: window}
}

func (l *Limiter) Do(ctx context.Context) error {
	select {
	case l.buf <- struct{}{}:
		go func() { <-time.After(l.window); <-l.buf }()
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

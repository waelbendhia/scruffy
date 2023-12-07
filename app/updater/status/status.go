package status

import (
	"context"
	"sync"
	"time"
)

type (
	Revalidator interface {
		RevalidateArtists(context.Context) error
		RevalidateAlbums(context.Context) error
	}
	StatusUpdater struct {
		listenersLock sync.RWMutex
		listeners     map[chan<- UpdateStatus]struct{}

		revalidator Revalidator

		statusLock sync.RWMutex
		status     UpdateStatus
	}
	StatusUpdaterOption func(*StatusUpdater)
)

func WithRevalidator(r Revalidator) StatusUpdaterOption {
	return func(su *StatusUpdater) { su.revalidator = r }
}

func NewStatusUpdater(opts ...StatusUpdaterOption) *StatusUpdater {
	su := &StatusUpdater{
		listeners: map[chan<- UpdateStatus]struct{}{},
	}

	for _, opt := range opts {
		opt(su)
	}

	if su.revalidator == nil {
		su.revalidator = NoopRevalidator{}
	}

	return su
}

func (su *StatusUpdater) GetStatus(ctx context.Context) (*UpdateStatus, error) {
	out := make(chan UpdateStatus, 1)
	go func() {
		su.statusLock.RLock()
		defer su.statusLock.RUnlock()

		c := su.status
		c.Errors = make([]string, len(c.Errors))
		c.Errors = append(c.Errors, su.status.Errors...)
		out <- c
	}()

	select {
	case c := <-out:
		return &c, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

func (su *StatusUpdater) ListenForUdpates(ctx context.Context) <-chan UpdateStatus {
	su.listenersLock.Lock()
	defer su.listenersLock.Unlock()

	out := make(chan UpdateStatus, 1)

	su.listeners[out] = struct{}{}

	go func() {
		defer close(out)
		<-ctx.Done()
		su.listenersLock.Lock()
		delete(su.listeners, out)
		su.listenersLock.Unlock()
	}()

	return out
}

func (su *StatusUpdater) broadcastChange(ctx context.Context) error {
	su.listenersLock.RLock()
	defer su.listenersLock.RUnlock()
	for l := range su.listeners {
		select {
		case l <- su.status:
		case <-ctx.Done():
			return ctx.Err()
		}
	}

	return nil
}

func (su *StatusUpdater) withUpdate(
	ctx context.Context,
	takesUpdate func(UpdateStatus) UpdateStatus,
) error {
	out := make(chan struct{}, 1)
	go func() {
		su.statusLock.Lock()
		defer su.statusLock.Unlock()

		su.status = takesUpdate(su.status)
		su.broadcastChange(ctx)

		out <- struct{}{}
	}()

	select {
	case <-out:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (su *StatusUpdater) StartUpdate(ctx context.Context) error {
	return su.withUpdate(ctx, func(us UpdateStatus) UpdateStatus {
		us.IsUpdating = true
		us.UpdateStart = time.Now()
		return us
	})
}

func (su *StatusUpdater) IncrementArtists(ctx context.Context) error {
	return su.withUpdate(ctx, func(us UpdateStatus) UpdateStatus {
		if us.IsUpdating {
			us.Artists++
		}
		return us
	})
}

func (su *StatusUpdater) IncrementAlbums(ctx context.Context) error {
	return su.withUpdate(ctx, func(us UpdateStatus) UpdateStatus {
		if us.IsUpdating {
			us.Albums++
		}
		return us
	})
}

func (su *StatusUpdater) IncrementPages(ctx context.Context) error {
	return su.withUpdate(ctx, func(us UpdateStatus) UpdateStatus {
		if us.IsUpdating {
			us.Pages++
		}
		return us
	})
}

func (su *StatusUpdater) AddError(ctx context.Context, newErr error) error {
	return su.withUpdate(ctx, func(us UpdateStatus) UpdateStatus {
		if us.IsUpdating {
			us.Errors = append(us.Errors, newErr.Error())
		}
		return us
	})
}

func (su *StatusUpdater) EndUpdate(ctx context.Context) error {
	return su.withUpdate(ctx, func(us UpdateStatus) UpdateStatus {
		if us.IsUpdating {
			us.IsUpdating = false
			us.UpdateEnd = time.Now()
		}
		return us
	})
}

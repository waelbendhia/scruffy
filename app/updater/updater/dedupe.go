package updater

import (
	"context"
	"sync"

	"golang.org/x/sync/errgroup"
)

func deduplicateWith[T any](
	ctx context.Context,
	concurrency int,
	on func(T) string,
	with func(a, b T) T,
	ins ...(<-chan T),
) <-chan T {
	var l sync.Mutex
	m := map[string]T{}

	insertVal := func(v T) {
		l.Lock()
		defer l.Unlock()

		k := on(v)
		prev, ok := m[k]
		if !ok {
			m[k] = v
			return
		}

		m[k] = with(v, prev)
	}

	out := make(chan T, concurrency)

	go func() {
		g, _ := errgroup.WithContext(ctx)

		for _, in := range ins {
			in := in
			g.Go(func() error {
				for v := range in {
					insertVal(v)
				}
				return nil
			})
		}

		g.Wait()

		defer close(out)
		for _, v := range m {
			select {
			case out <- v:
			case <-ctx.Done():
				return
			}
		}
	}()

	return out
}

func deduplicateOn[T any](
	ctx context.Context, concurrency int, on func(T) string, ins ...(<-chan T),
) <-chan T {
	out := make(chan T, concurrency)
	m := &sync.Map{}

	g, ctx := errgroup.WithContext(ctx)

	for _, in := range ins {
		in := in
		g.Go(func() error {
			for v := range in {
				_, ok := m.Load(on(v))
				if ok {
					continue
				}

				m.Store(on(v), struct{}{})
				select {
				case out <- v:
				case <-ctx.Done():
					return nil
				}
			}
			return nil
		})
	}

	go func() {
		defer close(out)
		_ = g.Wait()
	}()

	return out
}

package provider

import (
	"errors"
	"sync/atomic"
)

var ErrDisabled = errors.New("provider is disabled")

type disableable struct {
	isEnabled atomic.Bool
}

func (d *disableable) enabled() bool { return d.isEnabled.Load() }
func (d *disableable) disable()      { d.isEnabled.Store(false) }
func (d *disableable) enable()       { d.isEnabled.Store(true) }

package provider

import (
	"errors"
	"sync/atomic"
)

var ErrDisabled = errors.New("provider is disabled")

type disableable struct {
	enabled atomic.Bool
}

func (d *disableable) Enabled() bool { return d.enabled.Load() }
func (d *disableable) Disable()      { d.enabled.Store(false) }
func (d *disableable) Enable()       { d.enabled.Store(true) }

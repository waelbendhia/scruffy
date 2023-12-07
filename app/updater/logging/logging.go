package logging

import (
	"context"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

type contextKey string

const logContextKey contextKey = "logger"

func SetLogger(ctx context.Context, log *zap.Logger) context.Context {
	return context.WithValue(ctx, logContextKey, log)
}

func GetLogger(ctx context.Context) *zap.Logger {
	log, ok := ctx.Value(logContextKey).(*zap.Logger)
	if !ok {
		log, _ = zap.NewProduction()
	}

	return log
}

func AddField(ctx context.Context, fs ...zapcore.Field) context.Context {
	log := GetLogger(ctx)
	return SetLogger(ctx, log.With(fs...))
}

package webutils

import (
	"net/http"

	"connectrpc.com/grpcreflect"
)

type ReflectRegisterFunc func(reflectNames ...string)

func NewReflectRegister(
	mux *http.ServeMux,
) ReflectRegisterFunc {
	return func(reflectNames ...string) {
		reflector := grpcreflect.NewStaticReflector(
			reflectNames...,
		)

		mux.Handle(grpcreflect.NewHandlerV1(reflector))
		// Many tools still expect the older version of the server reflection API, so
		// most servers should mount both handlers.
		mux.Handle(grpcreflect.NewHandlerV1Alpha(reflector))
	}
}

package webutils

import (
	"connectrpc.com/connect"
	"connectrpc.com/validate"
)

type DefaultInterceptor connect.Option

func NewDefaultInterceptor() DefaultInterceptor {
	validator := validate.NewInterceptor()
	return connect.WithInterceptors(
		validator,
	)
}

package interceptors

import (
	"context"

	"buf.build/go/protovalidate"
	"connectrpc.com/connect"
	"google.golang.org/protobuf/proto"
)

// Validate returns a connect unary interceptor that runs protovalidate on
// every incoming request message. Validation failures are returned as
// CodeInvalidArgument errors.
func Validate() connect.UnaryInterceptorFunc {
	validator, err := protovalidate.New()
	if err != nil {
		panic("interceptors: failed to build protovalidate validator: " + err.Error())
	}

	return func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
			if msg, ok := req.Any().(proto.Message); ok {
				if verr := validator.Validate(msg); verr != nil {
					return nil, connect.NewError(connect.CodeInvalidArgument, verr)
				}
			}
			return next(ctx, req)
		}
	}
}

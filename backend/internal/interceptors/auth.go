package interceptors

import (
	"context"
	"errors"
	"strings"

	"connectrpc.com/connect"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey int

const accountIDKey contextKey = iota

// AccountIDFromContext returns the authenticated account ID stored by the
// Auth interceptor. The second return value is false when the context carries
// no identity (unauthenticated request).
func AccountIDFromContext(ctx context.Context) (int64, bool) {
	v, ok := ctx.Value(accountIDKey).(int64)
	return v, ok
}

// Auth returns a unary interceptor that validates a Bearer JWT on every
// request except the ones listed in publicProcedures (e.g. "/auth.v1.AuthService/Login").
func Auth(jwtSecret string, publicProcedures ...string) connect.UnaryInterceptorFunc {
	secret := []byte(jwtSecret)

	isPublic := func(procedure string) bool {
		for _, p := range publicProcedures {
			if p == procedure {
				return true
			}
		}
		return false
	}

	type jwtClaims struct {
		AccountID int64  `json:"aid"`
		Role      string `json:"role"`
		jwt.RegisteredClaims
	}

	return func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
			if isPublic(req.Spec().Procedure) {
				return next(ctx, req)
			}

			authHeader := req.Header().Get("Authorization")
			if authHeader == "" {
				return nil, connect.NewError(connect.CodeUnauthenticated, errors.New("missing Authorization header"))
			}
			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			if tokenStr == authHeader {
				return nil, connect.NewError(connect.CodeUnauthenticated, errors.New("authorization must be Bearer token"))
			}

			tok, err := jwt.ParseWithClaims(tokenStr, &jwtClaims{}, func(t *jwt.Token) (any, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, errors.New("unexpected signing method")
				}
				return secret, nil
			})
			if err != nil || !tok.Valid {
				return nil, connect.NewError(connect.CodeUnauthenticated, errors.New("invalid or expired token"))
			}

			c, ok := tok.Claims.(*jwtClaims)
			if !ok {
				return nil, connect.NewError(connect.CodeUnauthenticated, errors.New("invalid token claims"))
			}

			ctx = context.WithValue(ctx, accountIDKey, c.AccountID)
			return next(ctx, req)
		}
	}
}

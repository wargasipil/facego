package auth_service

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	authv1 "github.com/wargasipil/facego/gen/auth/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
	"gorm.io/gorm"
)

// Service implements authv1connect.AuthServiceHandler.
type Service struct {
	db        *gorm.DB
	jwtSecret []byte
}

func New(db *gorm.DB, jwtSecret string) *Service {
	return &Service{db: db, jwtSecret: []byte(jwtSecret)}
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

type claims struct {
	AccountID int64  `json:"aid"`
	Role      string `json:"role"`
	jwt.RegisteredClaims
}

func (s *Service) signToken(account *db_models.Account) (string, error) {
	c := claims{
		AccountID: int64(account.ID),
		Role:      account.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   account.Username,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString(s.jwtSecret)
}

func (s *Service) parseToken(tokenStr string) (*claims, error) {
	tok, err := jwt.ParseWithClaims(tokenStr, &claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	c, ok := tok.Claims.(*claims)
	if !ok || !tok.Valid {
		return nil, errors.New("invalid token")
	}
	return c, nil
}

// ── proto helpers ─────────────────────────────────────────────────────────────

func toProtoAccount(a *db_models.Account) *authv1.Account {
	return &authv1.Account{
		Id:          int64(a.ID),
		Username:    a.Username,
		DisplayName: a.DisplayName,
		Role:        roleToProto(a.Role),
	}
}

func roleToProto(r string) authv1.Role {
	switch r {
	case "admin":
		return authv1.Role_ROLE_ADMIN
	case "teacher":
		return authv1.Role_ROLE_TEACHER
	case "operator":
		return authv1.Role_ROLE_OPERATOR
	case "student":
		return authv1.Role_ROLE_STUDENT
	default:
		return authv1.Role_ROLE_UNSPECIFIED
	}
}

func roleFromProto(r authv1.Role) string {
	switch r {
	case authv1.Role_ROLE_ADMIN:
		return "admin"
	case authv1.Role_ROLE_TEACHER:
		return "teacher"
	case authv1.Role_ROLE_OPERATOR:
		return "operator"
	case authv1.Role_ROLE_STUDENT:
		return "student"
	default:
		return "operator"
	}
}

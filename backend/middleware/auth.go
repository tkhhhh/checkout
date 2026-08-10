package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type ctxKey string

const (
	CtxUserID ctxKey = "user_id"
	CtxRole   ctxKey = "role"
)

type Claims struct {
	UserID int64  `json:"uid"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func IssueToken(secret []byte, ttl time.Duration, userID int64, role string) (string, error) {
	c := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, c)
	return tok.SignedString(secret)
}

func RequireAuth(secret []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, err := parseBearer(r, secret)
			if err != nil {
				writeError(w, http.StatusUnauthorized, err.Error())
				return
			}
			ctx := context.WithValue(r.Context(), CtxUserID, claims.UserID)
			ctx = context.WithValue(ctx, CtxRole, claims.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireAdmin(secret []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, err := parseBearer(r, secret)
			if err != nil {
				writeError(w, http.StatusUnauthorized, err.Error())
				return
			}
			if claims.Role != "admin" {
				writeError(w, http.StatusForbidden, "admin only")
				return
			}
			ctx := context.WithValue(r.Context(), CtxUserID, claims.UserID)
			ctx = context.WithValue(ctx, CtxRole, claims.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func parseBearer(r *http.Request, secret []byte) (*Claims, error) {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") {
		return nil, errMissing
	}
	raw := strings.TrimPrefix(h, "Bearer ")
	claims := &Claims{}
	tok, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errInvalid
		}
		return secret, nil
	})
	if err != nil || !tok.Valid {
		return nil, errInvalid
	}
	return claims, nil
}

func UserIDFrom(ctx context.Context) (int64, bool) {
	v, ok := ctx.Value(CtxUserID).(int64)
	return v, ok
}

type sentinel string

func (s sentinel) Error() string { return string(s) }

const (
	errMissing sentinel = "missing or malformed Authorization header"
	errInvalid sentinel = "invalid or expired token"
)

func writeError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

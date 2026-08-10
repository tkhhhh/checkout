package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/checkout/backend/middleware"
	"github.com/checkout/backend/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	DB     *pgxpool.Pool
	Secret []byte
	TTL    time.Duration
}

type registerReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResp struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var in registerReq
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	if in.Email == "" || len(in.Password) < 6 || in.Name == "" {
		writeError(w, http.StatusBadRequest, "email, name and password (6+ chars) required")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "hash failed")
		return
	}
	u := models.User{}
	err = h.DB.QueryRow(r.Context(), `
		INSERT INTO users (email, password_hash, name, role)
		VALUES ($1,$2,$3,'customer')
		RETURNING id, email, name, role, created_at
	`, in.Email, string(hash), in.Name).Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.CreatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "users_email_key") {
			writeError(w, http.StatusConflict, "email already registered")
			return
		}
		writeError(w, http.StatusInternalServerError, "create user: "+err.Error())
		return
	}
	tok, _ := middleware.IssueToken(h.Secret, h.TTL, u.ID, u.Role)
	writeJSON(w, http.StatusCreated, authResp{Token: tok, User: u})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var in loginReq
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	u := models.User{}
	err := h.DB.QueryRow(r.Context(), `
		SELECT id, email, password_hash, name, role, created_at
		FROM users WHERE email=$1
	`, in.Email).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Role, &u.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(in.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	tok, _ := middleware.IssueToken(h.Secret, h.TTL, u.ID, u.Role)
	writeJSON(w, http.StatusOK, authResp{Token: tok, User: u})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.UserIDFrom(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "no auth")
		return
	}
	u := models.User{}
	err := h.DB.QueryRow(r.Context(),
		`SELECT id, email, name, role, created_at FROM users WHERE id=$1`, uid,
	).Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.CreatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

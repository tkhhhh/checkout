package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

const adminEmail = "admin@example.com"

// SeedAdmin ensures the admin@example.com user exists with the given password.
// Runs on every boot so rotating the ADMIN_PASSWORD secret and redeploying
// updates the stored hash.
func SeedAdmin(ctx context.Context, pool *pgxpool.Pool, password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash admin password: %w", err)
	}
	_, err = pool.Exec(ctx, `
		INSERT INTO users (email, password_hash, name, role)
		VALUES ($1, $2, 'Admin User', 'admin')
		ON CONFLICT (email) DO UPDATE
		  SET password_hash = EXCLUDED.password_hash,
		      role          = 'admin'
	`, adminEmail, string(hash))
	if err != nil {
		return fmt.Errorf("upsert admin user: %w", err)
	}
	return nil
}

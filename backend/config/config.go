package config

import (
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	Env            string
	DatabaseURL    string
	JWTSecret      []byte
	JWTTTL         time.Duration
	AllowedOrigins []string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, falling back to process env")
	}

	ttlHours, _ := strconv.Atoi(getenv("JWT_TTL_HOURS", "24"))

	return &Config{
		Port:           getenv("PORT", "8080"),
		Env:            getenv("ENV", "development"),
		DatabaseURL:    mustGetenv("DATABASE_URL"),
		JWTSecret:      []byte(mustGetenv("JWT_SECRET")),
		JWTTTL:         time.Duration(ttlHours) * time.Hour,
		AllowedOrigins: strings.Split(getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174"), ","),
	}
}

func getenv(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}

func mustGetenv(k string) string {
	v := os.Getenv(k)
	if v == "" {
		log.Fatalf("missing required env var: %s", k)
	}
	return v
}

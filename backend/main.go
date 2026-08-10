package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/checkout/backend/config"
	"github.com/checkout/backend/db"
	"github.com/checkout/backend/handlers"
	mw "github.com/checkout/backend/middleware"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	cfg := config.Load()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	auth := &handlers.AuthHandler{DB: pool, Secret: cfg.JWTSecret, TTL: cfg.JWTTTL}
	products := &handlers.ProductHandler{DB: pool}
	orders := &handlers.OrderHandler{DB: pool}
	stats := &handlers.StatsHandler{DB: pool}

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(30 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	r.Route("/api", func(r chi.Router) {
		// Public
		r.Post("/auth/register", auth.Register)
		r.Post("/auth/login", auth.Login)

		r.Get("/products", products.List)
		r.Get("/products/{id}", products.Get)

		// Authenticated customer (guests cannot check out or pay)
		r.Group(func(r chi.Router) {
			r.Use(mw.RequireAuth(cfg.JWTSecret))
			r.Get("/me", auth.Me)
			r.Post("/checkout", orders.Checkout)
			r.Post("/orders/{id}/pay", orders.Pay)
			r.Get("/orders/mine", orders.ListMine)
			r.Get("/orders/{id}", orders.GetMine)
		})

		// Admin only
		r.Route("/admin", func(r chi.Router) {
			r.Use(mw.RequireAdmin(cfg.JWTSecret))
			r.Get("/stats", stats.Dashboard)

			r.Get("/products", products.List) // ?all=1 includes inactive
			r.Post("/products", products.Create)
			r.Put("/products/{id}", products.Update)
			r.Delete("/products/{id}", products.Delete)

			r.Get("/orders", orders.ListAll)
			r.Get("/orders/{id}", orders.Get)
			r.Patch("/orders/{id}", orders.UpdateStatus)
		})
	})

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("listening on :%s (env=%s)", cfg.Port, cfg.Env)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	log.Println("shutting down...")
	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()
	_ = srv.Shutdown(shutdownCtx)
}

package handlers

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
)

type StatsHandler struct {
	DB *pgxpool.Pool
}

type dashboardStats struct {
	TotalProducts int `json:"total_products"`
	ActiveStock   int `json:"active_stock"`
	TotalOrders   int `json:"total_orders"`
	PendingOrders int `json:"pending_orders"`
	RevenueCents  int `json:"revenue_cents"`
}

func (h *StatsHandler) Dashboard(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	out := dashboardStats{}
	_ = h.DB.QueryRow(ctx, `SELECT COUNT(*) FROM products WHERE active=TRUE`).Scan(&out.TotalProducts)
	_ = h.DB.QueryRow(ctx, `SELECT COALESCE(SUM(stock),0) FROM products WHERE active=TRUE`).Scan(&out.ActiveStock)
	_ = h.DB.QueryRow(ctx, `SELECT COUNT(*) FROM orders`).Scan(&out.TotalOrders)
	_ = h.DB.QueryRow(ctx, `SELECT COUNT(*) FROM orders WHERE status='pending'`).Scan(&out.PendingOrders)
	_ = h.DB.QueryRow(ctx, `SELECT COALESCE(SUM(total_cents),0) FROM orders WHERE status IN ('paid','shipped')`).Scan(&out.RevenueCents)
	writeJSON(w, http.StatusOK, out)
}

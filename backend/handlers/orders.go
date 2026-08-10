package handlers

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/checkout/backend/middleware"
	"github.com/checkout/backend/models"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OrderHandler struct {
	DB *pgxpool.Pool
}

type checkoutItem struct {
	ProductID int64 `json:"product_id"`
	Quantity  int   `json:"quantity"`
}

type checkoutReq struct {
	ShippingAddress string         `json:"shipping_address"`
	Items           []checkoutItem `json:"items"`
}

// Checkout validates stock, decrements it, and creates a pending order in one
// serializable transaction. Auth is required — guests cannot place orders.
// The order's email is taken from the authenticated user.
func (h *OrderHandler) Checkout(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid, ok := middleware.UserIDFrom(ctx)
	if !ok {
		writeError(w, http.StatusUnauthorized, "login required to check out")
		return
	}

	var in checkoutReq
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if len(in.Items) == 0 {
		writeError(w, http.StatusBadRequest, "items required")
		return
	}
	if strings.TrimSpace(in.ShippingAddress) == "" {
		writeError(w, http.StatusBadRequest, "shipping_address required")
		return
	}

	var email string
	if err := h.DB.QueryRow(ctx, `SELECT email FROM users WHERE id=$1`, uid).Scan(&email); err != nil {
		writeError(w, http.StatusUnauthorized, "user not found")
		return
	}

	tx, err := h.DB.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback(ctx)

	total := 0
	resolved := make([]models.OrderItem, 0, len(in.Items))

	for _, it := range in.Items {
		if it.Quantity <= 0 {
			writeError(w, http.StatusBadRequest, "quantity must be > 0")
			return
		}
		var p models.Product
		err := tx.QueryRow(ctx, `
			SELECT id, name, price_cents, stock, active
			FROM products WHERE id=$1 FOR UPDATE
		`, it.ProductID).Scan(&p.ID, &p.Name, &p.PriceCents, &p.Stock, &p.Active)
		if err != nil {
			writeError(w, http.StatusBadRequest, "unknown product")
			return
		}
		if !p.Active {
			writeError(w, http.StatusBadRequest, "product not available: "+p.Name)
			return
		}
		if p.Stock < it.Quantity {
			writeError(w, http.StatusConflict, "insufficient stock for "+p.Name)
			return
		}
		if _, err := tx.Exec(ctx,
			`UPDATE products SET stock = stock - $1, updated_at=NOW() WHERE id=$2`,
			it.Quantity, p.ID); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		total += p.PriceCents * it.Quantity
		resolved = append(resolved, models.OrderItem{
			ProductID:  p.ID,
			Name:       p.Name,
			PriceCents: p.PriceCents,
			Quantity:   it.Quantity,
		})
	}

	var orderID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO orders (user_id, email, total_cents, status, shipping_address)
		VALUES ($1,$2,$3,'pending',$4) RETURNING id
	`, uid, email, total, in.ShippingAddress).Scan(&orderID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	for _, it := range resolved {
		if _, err := tx.Exec(ctx, `
			INSERT INTO order_items (order_id, product_id, name, price_cents, quantity)
			VALUES ($1,$2,$3,$4,$5)
		`, orderID, it.ProductID, it.Name, it.PriceCents, it.Quantity); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	order, err := h.loadOrder(ctx, orderID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, order)
}

type payReq struct {
	CardNumber     string `json:"card_number"`
	CardholderName string `json:"cardholder_name"`
	ExpMonth       int    `json:"exp_month"`
	ExpYear        int    `json:"exp_year"`
	CVC            string `json:"cvc"`
}

var digitsOnly = regexp.MustCompile(`\D`)

// Pay simulates a card payment for a pending order. Card details are validated
// (Luhn + length + non-past expiry + CVC format) but never stored — we only
// keep a synthetic payment_ref on the order.
func (h *OrderHandler) Pay(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid, ok := middleware.UserIDFrom(ctx)
	if !ok {
		writeError(w, http.StatusUnauthorized, "login required")
		return
	}
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad id")
		return
	}

	var in payReq
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	pan := digitsOnly.ReplaceAllString(in.CardNumber, "")
	cvc := digitsOnly.ReplaceAllString(in.CVC, "")
	if len(pan) < 13 || len(pan) > 19 || !luhn(pan) {
		writeError(w, http.StatusBadRequest, "invalid card number")
		return
	}
	if len(cvc) < 3 || len(cvc) > 4 {
		writeError(w, http.StatusBadRequest, "invalid cvc")
		return
	}
	if strings.TrimSpace(in.CardholderName) == "" {
		writeError(w, http.StatusBadRequest, "cardholder_name required")
		return
	}
	if !validExpiry(in.ExpMonth, in.ExpYear) {
		writeError(w, http.StatusBadRequest, "card expired or invalid expiry")
		return
	}

	tx, err := h.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback(ctx)

	var ownerID *int64
	var status string
	err = tx.QueryRow(ctx,
		`SELECT user_id, status FROM orders WHERE id=$1 FOR UPDATE`, id).
		Scan(&ownerID, &status)
	if err != nil {
		writeError(w, http.StatusNotFound, "order not found")
		return
	}
	if ownerID == nil || *ownerID != uid {
		writeError(w, http.StatusForbidden, "not your order")
		return
	}
	if status != "pending" {
		writeError(w, http.StatusConflict, "order is "+status+", cannot pay")
		return
	}

	ref := fmt.Sprintf("pay_%d_%s", id, randHex(8))
	if _, err := tx.Exec(ctx, `
		UPDATE orders
		SET status='paid', paid_at=NOW(), payment_ref=$1, updated_at=NOW()
		WHERE id=$2
	`, ref, id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	order, err := h.loadOrder(ctx, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, order)
}

func luhn(s string) bool {
	sum, alt := 0, false
	for i := len(s) - 1; i >= 0; i-- {
		d := int(s[i] - '0')
		if d < 0 || d > 9 {
			return false
		}
		if alt {
			d *= 2
			if d > 9 {
				d -= 9
			}
		}
		sum += d
		alt = !alt
	}
	return sum%10 == 0
}

func validExpiry(month, year int) bool {
	if month < 1 || month > 12 {
		return false
	}
	if year < 100 {
		year += 2000
	}
	now := time.Now().UTC()
	exp := time.Date(year, time.Month(month)+1, 1, 0, 0, 0, 0, time.UTC).Add(-time.Nanosecond)
	return exp.After(now)
}

func randHex(n int) string {
	const hex = "0123456789abcdef"
	b := make([]byte, n)
	now := time.Now().UnixNano()
	for i := range b {
		b[i] = hex[(now>>(uint(i)*4))&0xf]
	}
	return string(b)
}

func (h *OrderHandler) ListMine(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.UserIDFrom(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "no auth")
		return
	}
	orders, err := h.queryOrders(r.Context(), "WHERE user_id=$1", uid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, orders)
}

func (h *OrderHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	var (
		orders []models.Order
		err    error
	)
	if status != "" {
		orders, err = h.queryOrders(r.Context(), "WHERE status=$1", status)
	} else {
		orders, err = h.queryOrders(r.Context(), "")
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, orders)
}

func (h *OrderHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad id")
		return
	}
	o, err := h.loadOrder(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, o)
}

// GetMine lets an authenticated customer fetch one of their own orders.
func (h *OrderHandler) GetMine(w http.ResponseWriter, r *http.Request) {
	uid, ok := middleware.UserIDFrom(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "no auth")
		return
	}
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad id")
		return
	}
	o, err := h.loadOrder(r.Context(), id)
	if err != nil || o.UserID == nil || *o.UserID != uid {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, o)
}

type updateStatusReq struct {
	Status string `json:"status"`
}

func (h *OrderHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad id")
		return
	}
	var in updateStatusReq
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	ct, err := h.DB.Exec(r.Context(),
		`UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2`, in.Status, id)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if ct.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	o, _ := h.loadOrder(r.Context(), id)
	writeJSON(w, http.StatusOK, o)
}

func (h *OrderHandler) queryOrders(ctx context.Context, where string, args ...any) ([]models.Order, error) {
	sql := `SELECT id, user_id, email, total_cents, status, shipping_address,
	               paid_at, payment_ref, created_at, updated_at
	        FROM orders ` + where + ` ORDER BY id DESC`
	rows, err := h.DB.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.Order{}
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(&o.ID, &o.UserID, &o.Email, &o.TotalCents,
			&o.Status, &o.ShippingAddress, &o.PaidAt, &o.PaymentRef,
			&o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, nil
}

func (h *OrderHandler) loadOrder(ctx context.Context, id int64) (*models.Order, error) {
	var o models.Order
	err := h.DB.QueryRow(ctx, `
		SELECT id, user_id, email, total_cents, status, shipping_address,
		       paid_at, payment_ref, created_at, updated_at
		FROM orders WHERE id=$1
	`, id).Scan(&o.ID, &o.UserID, &o.Email, &o.TotalCents,
		&o.Status, &o.ShippingAddress, &o.PaidAt, &o.PaymentRef,
		&o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		return nil, err
	}
	rows, err := h.DB.Query(ctx, `
		SELECT id, order_id, product_id, name, price_cents, quantity
		FROM order_items WHERE order_id=$1 ORDER BY id
	`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var it models.OrderItem
		if err := rows.Scan(&it.ID, &it.OrderID, &it.ProductID,
			&it.Name, &it.PriceCents, &it.Quantity); err != nil {
			return nil, err
		}
		o.Items = append(o.Items, it)
	}
	return &o, nil
}

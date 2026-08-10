package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/checkout/backend/models"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProductHandler struct {
	DB *pgxpool.Pool
}

// List returns active products. If ?q= is supplied, name/description are filtered.
// If ?all=1 and caller is admin (enforced by route), include inactive products.
func (h *ProductHandler) List(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	all := r.URL.Query().Get("all") == "1"

	sql := `SELECT id, sku, name, description, price_cents, stock, image_url, active, created_at, updated_at
	        FROM products`
	conds := []string{}
	args := []any{}
	if !all {
		conds = append(conds, "active = TRUE")
	}
	if q != "" {
		args = append(args, "%"+q+"%")
		conds = append(conds, "(name ILIKE $1 OR description ILIKE $1)")
	}
	if len(conds) > 0 {
		sql += " WHERE " + strings.Join(conds, " AND ")
	}
	sql += " ORDER BY id DESC"

	rows, err := h.DB.Query(r.Context(), sql, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	out := []models.Product{}
	for rows.Next() {
		var p models.Product
		if err := rows.Scan(&p.ID, &p.SKU, &p.Name, &p.Description, &p.PriceCents,
			&p.Stock, &p.ImageURL, &p.Active, &p.CreatedAt, &p.UpdatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		out = append(out, p)
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *ProductHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad id")
		return
	}
	var p models.Product
	err = h.DB.QueryRow(r.Context(), `
		SELECT id, sku, name, description, price_cents, stock, image_url, active, created_at, updated_at
		FROM products WHERE id=$1
	`, id).Scan(&p.ID, &p.SKU, &p.Name, &p.Description, &p.PriceCents,
		&p.Stock, &p.ImageURL, &p.Active, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, p)
}

type productInput struct {
	SKU         string `json:"sku"`
	Name        string `json:"name"`
	Description string `json:"description"`
	PriceCents  int    `json:"price_cents"`
	Stock       int    `json:"stock"`
	ImageURL    string `json:"image_url"`
	Active      *bool  `json:"active,omitempty"`
}

func (h *ProductHandler) Create(w http.ResponseWriter, r *http.Request) {
	var in productInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if in.Name == "" || in.PriceCents < 0 {
		writeError(w, http.StatusBadRequest, "name and non-negative price required")
		return
	}
	active := true
	if in.Active != nil {
		active = *in.Active
	}
	// SKU is always server-assigned as SKU-<zero-padded id>. We insert with a
	// unique placeholder (SKU is UNIQUE NOT NULL), then rewrite it using the
	// row's own id. Wrapped in a transaction so nothing observes the placeholder.
	tx, err := h.DB.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback(r.Context())

	var newID int64
	err = tx.QueryRow(r.Context(), `
		INSERT INTO products (sku,name,description,price_cents,stock,image_url,active)
		VALUES ('__pending_' || gen_random_uuid()::text,$1,$2,$3,$4,$5,$6)
		RETURNING id
	`, in.Name, in.Description, in.PriceCents, in.Stock, in.ImageURL, active).Scan(&newID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	sku := fmt.Sprintf("SKU-%03d", newID)
	var p models.Product
	err = tx.QueryRow(r.Context(), `
		UPDATE products
		SET sku=$1, updated_at=NOW()
		WHERE id=$2
		RETURNING id, sku, name, description, price_cents, stock, image_url, active, created_at, updated_at
	`, sku, newID).Scan(&p.ID, &p.SKU, &p.Name, &p.Description, &p.PriceCents,
		&p.Stock, &p.ImageURL, &p.Active, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (h *ProductHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad id")
		return
	}
	var in productInput
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	active := true
	if in.Active != nil {
		active = *in.Active
	}
	// SKU is server-owned and never accepted from the client on update.
	var p models.Product
	err = h.DB.QueryRow(r.Context(), `
		UPDATE products
		SET name=$1, description=$2, price_cents=$3, stock=$4,
		    image_url=$5, active=$6, updated_at=NOW()
		WHERE id=$7
		RETURNING id, sku, name, description, price_cents, stock, image_url, active, created_at, updated_at
	`, in.Name, in.Description, in.PriceCents, in.Stock, in.ImageURL, active, id).
		Scan(&p.ID, &p.SKU, &p.Name, &p.Description, &p.PriceCents,
			&p.Stock, &p.ImageURL, &p.Active, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (h *ProductHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad id")
		return
	}
	// Soft delete: mark inactive. Hard delete would break order_items FKs.
	ct, err := h.DB.Exec(r.Context(),
		`UPDATE products SET active=FALSE, updated_at=NOW() WHERE id=$1`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if ct.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

package models

import "time"

type User struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

type Product struct {
	ID          int64     `json:"id"`
	SKU         string    `json:"sku"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	PriceCents  int       `json:"price_cents"`
	Stock       int       `json:"stock"`
	ImageURL    string    `json:"image_url"`
	Active      bool      `json:"active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type OrderItem struct {
	ID         int64  `json:"id"`
	OrderID    int64  `json:"order_id"`
	ProductID  int64  `json:"product_id"`
	Name       string `json:"name"`
	PriceCents int    `json:"price_cents"`
	Quantity   int    `json:"quantity"`
}

type Order struct {
	ID              int64       `json:"id"`
	UserID          *int64      `json:"user_id,omitempty"`
	Email           string      `json:"email"`
	TotalCents      int         `json:"total_cents"`
	Status          string      `json:"status"`
	ShippingAddress string      `json:"shipping_address"`
	PaidAt          *time.Time  `json:"paid_at,omitempty"`
	PaymentRef      *string     `json:"payment_ref,omitempty"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
	Items           []OrderItem `json:"items,omitempty"`
}

# HTTP API

Base URL: `http://localhost:8080`

All endpoints return JSON. Errors look like:

```json
{ "error": "human-readable message" }
```

Authentication is via a bearer token:

```
Authorization: Bearer <jwt>
```

Tokens are issued by `/api/auth/login` and `/api/auth/register`.

---

## Health

### `GET /health`

```json
{ "status": "ok" }
```

---

## Auth

### `POST /api/auth/register`

Public. Creates a `customer` account and returns a token.

```json
// request
{ "email": "alice@example.com", "password": "hunter22", "name": "Alice" }

// 201 response
{
  "token": "eyJhbGciOi…",
  "user": { "id": 7, "email": "alice@example.com", "name": "Alice", "role": "customer", "created_at": "…" }
}
```

Errors: `400` invalid input · `409` email taken.

### `POST /api/auth/login`

Public.

```json
// request
{ "email": "admin@example.com", "password": "admin123" }

// 200 response (same shape as /register)
```

Errors: `401` invalid credentials.

### `GET /api/me`

Requires bearer token. Returns the current user.

---

## Products (public)

### `GET /api/products?q=<query>`

Lists **active** products. Optional `q` substring-matches name or description
(case-insensitive).

```json
[
  {
    "id": 1, "sku": "SKU-001", "name": "Classic T-Shirt",
    "description": "Soft cotton crew-neck tee.",
    "price_cents": 1999, "stock": 50,
    "image_url": "https://…", "active": true,
    "created_at": "…", "updated_at": "…"
  }
]
```

### `GET /api/products/{id}`

Returns one product or `404`.

---

## Checkout

### `POST /api/checkout`

Public **or** authenticated (bearer optional). Validates stock, decrements
it, and creates an order in a single serializable transaction. If a valid
bearer token is supplied, the order is linked to that user.

```json
// request
{
  "email": "alice@example.com",
  "shipping_address": "1 Market St, SF",
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 5, "quantity": 1 }
  ]
}

// 201 response — full order with items
{
  "id": 42, "user_id": 7, "email": "alice@example.com",
  "total_cents": 12997, "status": "pending",
  "shipping_address": "1 Market St, SF",
  "created_at": "…", "updated_at": "…",
  "items": [
    { "id": 81, "order_id": 42, "product_id": 1, "name": "Classic T-Shirt", "price_cents": 1999, "quantity": 2 },
    { "id": 82, "order_id": 42, "product_id": 5, "name": "Wireless Headphones", "price_cents": 8999, "quantity": 1 }
  ]
}
```

Errors:
- `400` unknown product / quantity ≤ 0 / product inactive
- `409` insufficient stock for one of the items
- `500` database error

---

## Customer orders

### `GET /api/orders/mine`

Requires bearer token. Lists the caller's orders, newest first.

---

## Admin

All admin routes require a token whose user has `role=admin`. Otherwise
`403 admin only`.

### `GET /api/admin/stats`

```json
{
  "total_products": 6,
  "active_stock": 305,
  "total_orders": 3,
  "pending_orders": 1,
  "revenue_cents": 24998
}
```

`revenue_cents` counts only orders in `paid` or `shipped` status.

### `GET /api/admin/products?all=1&q=…`

Same shape as the public list. `all=1` includes archived products.

### `POST /api/admin/products`

```json
// request
{
  "sku": "SKU-007", "name": "Beanie", "description": "Wool beanie.",
  "price_cents": 2499, "stock": 30, "image_url": "https://…", "active": true
}
```

Returns `201` with the created product.

### `PUT /api/admin/products/{id}`

Full update of one product. Same body shape as create.

### `DELETE /api/admin/products/{id}`

Soft delete: marks the product `active=false`. Hard delete would break
foreign keys on historical `order_items`.

### `GET /api/admin/orders?status=<status>`

Lists every order. Filter by status: `pending`, `paid`, `shipped`,
`cancelled`, `refunded`.

### `GET /api/admin/orders/{id}`

Returns one order with its `items` populated.

### `PATCH /api/admin/orders/{id}`

```json
// request
{ "status": "shipped" }
```

Valid statuses: `pending`, `paid`, `shipped`, `cancelled`, `refunded`.

---

## cURL recipes

```bash
# log in as admin
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123"}' | jq -r .token)

# dashboard stats
curl -s http://localhost:8080/api/admin/stats -H "authorization: bearer $TOKEN" | jq

# place an anonymous order
curl -s -X POST http://localhost:8080/api/checkout \
  -H 'content-type: application/json' \
  -d '{"email":"guest@example.com","shipping_address":"1 Market St","items":[{"product_id":1,"quantity":1}]}' | jq
```

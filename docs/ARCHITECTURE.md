# Architecture

## High-level shape

```
 ┌────────────────────┐     ┌────────────────────┐
 │  storefront/       │     │  admin/            │
 │  React + Vite      │     │  React + Vite      │
 │  :5173             │     │  :5174             │
 └────────┬───────────┘     └─────────┬──────────┘
          │ JSON / HTTPS              │ JSON / HTTPS
          └────────────┬──────────────┘
                       ▼
              ┌──────────────────┐
              │ backend/         │
              │ Go · chi router  │
              │ JWT auth         │
              │ :8080            │
              └────────┬─────────┘
                       │ pgx pool
                       ▼
              ┌──────────────────┐
              │  Postgres 14+    │
              └──────────────────┘
```

Two separate React apps share one API. They can be hosted on different
origins; the backend's CORS allowlist (`ALLOWED_ORIGINS`) controls who can
talk to it.

## Backend layout

```
backend/
├── main.go               # wiring: router, middleware, route table
├── config/               # env-driven config
├── db/
│   ├── db.go             # pgx pool + embedded migration runner
│   └── migrations/*.sql  # applied in lexical order
├── handlers/             # one file per resource (auth, products, orders, stats)
├── middleware/           # JWT auth + role guard
└── models/               # plain Go structs that mirror DB rows
```

The handler layer talks to Postgres directly via `pgxpool`. There is no
ORM — every SQL statement is in plain sight, parameterized, and easy to
audit.

### Why no service layer

Handlers are thin: parse, run one SQL statement (or a transaction), write
JSON. A separate "service" abstraction would add ceremony without changing
the call graph. When a handler grows past ~80 lines or starts being reused,
that's the right time to extract.

## Data model

```
users (id, email UNIQUE, password_hash, name, role, created_at)
products (id, sku UNIQUE, name, description, price_cents, stock, image_url, active, created_at, updated_at)
orders (id, user_id → users, email, total_cents, status, shipping_address, created_at, updated_at)
order_items (id, order_id → orders, product_id → products, name, price_cents, quantity)
```

Decisions worth knowing:

- **Money is stored as `INTEGER` cents** end-to-end. Floating-point currency
  is a perennial source of off-by-one bugs.
- **`order_items` snapshot the product name and price** at the time of
  purchase. Products evolve; historical orders should not retroactively
  change.
- **`products.active` instead of hard delete.** Order items hold a FK to
  `products.id` — wiping a product would break order history. Soft delete
  also makes "undelete" trivial.
- **`orders.user_id` is nullable**, so the same table holds guest and
  customer orders. Guests are identified by their email only.

## Request flow: checkout

The most interesting interaction. `POST /api/checkout`:

1. The router runs `optionalAuth`: if a bearer token is present and valid,
   `user_id` is added to the request context; otherwise the request still
   proceeds anonymously.
2. The handler decodes the JSON payload and starts a
   `SERIALIZABLE` transaction.
3. For each item it `SELECT … FOR UPDATE`s the corresponding product to
   pin the stock row, then checks `active` and `stock >= quantity`.
4. It decrements stock and tallies the cents.
5. It inserts the `orders` row and one `order_items` row per item.
6. It commits and returns the full order.

If any check fails the deferred `tx.Rollback` undoes the stock decrement.
Serializable isolation guarantees two concurrent checkouts cannot both
"see" the same stock level.

## Auth

JWT (HS256) with a single signing secret. The token carries:

```json
{ "uid": 7, "role": "customer", "exp": 1717977600, "iat": 1717891200 }
```

Two middlewares wrap protected routes:

- `RequireAuth` — any valid token
- `RequireAdmin` — valid token *and* `role=admin`

There is also an inline `optionalAuth` helper used only by `/api/checkout`.

Passwords are stored as bcrypt hashes (cost 10).

## Frontend conventions

Both React apps follow the same skeleton:

- `src/main.jsx` mounts the app and providers
- `src/api.js` is the single HTTP entry point — every fetch goes through it
- `src/auth.jsx` (admin) / `src/store/auth.jsx` (storefront) holds the
  current session in React context and mirrors it to `localStorage`
- `src/pages/*` are route components; `src/components/*` are shared bits
- `src/styles.css` is the only stylesheet — no CSS framework, no build-time
  preprocessing

The storefront additionally has `src/store/cart.jsx`, a `localStorage`-backed
cart that survives page reloads and works for anonymous shoppers.

## What is intentionally missing

This codebase is meant to read top-to-bottom on a laptop — not run a real
shop. Things you would add for production:

- **Real payments** — `/api/checkout` jumps straight from "pending" to a
  committed order without charging a card. A Stripe integration would
  PaymentIntent → webhook → flip status to `paid`.
- **Email** — order confirmations, password resets.
- **Refresh tokens** — the current setup is single-token, 24-hour TTL.
- **Rate limiting & request validation library** — currently ad-hoc.
- **Inventory backorders, taxes, shipping rates, discounts** — the order
  total is `Σ price × qty`, full stop.
- **Pagination** — admin lists return everything.
- **Tests** — none included; this is a demo.

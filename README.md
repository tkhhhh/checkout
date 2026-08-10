# Checkout — full-stack e-commerce demo

A complete, runnable example of an online store with three pieces:

| Piece          | Stack                                 | Default port |
| -------------- | ------------------------------------- | ------------ |
| `backend/`     | Go 1.22 · chi · pgx · Postgres · JWT  | `8080`       |
| `storefront/`  | React 18 · Vite · React Router        | `5173`       |
| `admin/`       | React 18 · Vite · React Router        | `5174`       |

It supports the full happy path:

- browse a catalog of products
- add items to a cart (persists in `localStorage`)
- register / log in and check out (login required — no guest payment)
- pay for the pending order on a dedicated payment page (demo card processor)
- on the admin side: sign in, see live dashboard stats, create / edit /
  archive products, list orders, change order status

## Test accounts

Use these to log in against a freshly seeded database:

| Role     | URL                     | Email                 | Password    |
| -------- | ----------------------- | --------------------- | ----------- |
| Admin    | http://localhost:5174   | `admin@example.com`   | `admin123`  |
| Customer | http://localhost:5173   | *register any email*  | *≥ 6 chars* |

Test card for the payment page (demo mode — no real charge):

| Field          | Value                  |
| -------------- | ---------------------- |
| Card number    | `4242 4242 4242 4242`  |
| Expiry         | any future month/year  |
| CVC            | any 3 digits (e.g. `123`) |
| Cardholder     | any non-empty name     |

## Quick start (Docker)

```bash
make up          # builds all images, starts Postgres + backend + storefront + admin
```

Then open http://localhost:5173 (store) and http://localhost:5174 (admin).
`make help` lists the other targets (`down`, `logs`, `db-sh`, `clean`, …).

## Quick start (native)

```bash
# 1. Postgres up and running locally, then:
createdb checkout

# 2. backend
cd backend
cp .env.example .env            # edit DATABASE_URL / JWT_SECRET
go run .                        # migrations + seed run automatically

# 3. storefront (in a new shell)
cd storefront
cp .env.example .env
npm install
npm run dev                     # → http://localhost:5173

# 4. admin (in another shell)
cd admin
cp .env.example .env
npm install
npm run dev                     # → http://localhost:5174
```

## Documentation

- [`docs/SETUP.md`](docs/SETUP.md) — prerequisites, env vars, common issues
- [`docs/API.md`](docs/API.md) — every HTTP endpoint with example payloads
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the pieces fit together, data model, request flow

## Repo layout

```
checkout/
├── backend/         Go API
├── storefront/      Customer-facing React app
├── admin/           Admin dashboard React app
└── docs/            Setup, API reference, architecture
```

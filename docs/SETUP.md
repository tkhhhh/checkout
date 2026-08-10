# Setup

## Prerequisites

- Go **1.22+**
- Node **18+** (LTS recommended) — for the storefront and admin apps
- PostgreSQL **14+** — running locally or reachable over the network

## 1. Create the database

```bash
createdb checkout
```

Or, with `psql`:

```sql
CREATE DATABASE checkout;
```

## 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

| Variable          | Example                                                          | Notes |
| ----------------- | ---------------------------------------------------------------- | ----- |
| `PORT`            | `8080`                                                           | API listen port |
| `ENV`             | `development`                                                    | informational only |
| `DATABASE_URL`    | `postgres://postgres:postgres@localhost:5432/checkout?sslmode=disable` | libpq URL |
| `JWT_SECRET`      | `<64+ random chars>`                                             | rotate this in production |
| `JWT_TTL_HOURS`   | `24`                                                             | how long tokens stay valid |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:5174`                    | comma-separated CORS origins |

Run the API:

```bash
go run .
```

On first start the server:

1. opens a connection pool to Postgres,
2. applies every SQL file in `db/migrations/` (tracked in
   `schema_migrations`, so re-runs are safe),
3. seeds an admin user and six sample products **if the tables are empty**.

Default seed account: `admin@example.com` / `admin123` — change immediately
in any non-throwaway environment.

## 3. Configure the storefront

```bash
cd storefront
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

## 4. Configure the admin dashboard

```bash
cd admin
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5174` and sign in with the seed admin credentials.

## Production builds

Both React apps are static after a build:

```bash
cd storefront && npm run build   # → storefront/dist/
cd admin      && npm run build   # → admin/dist/
```

Serve `dist/` from any static host (S3 + CloudFront, Netlify, Nginx, …) and
point the apps at the production API URL via `VITE_API_URL`.

For the backend:

```bash
cd backend
CGO_ENABLED=0 go build -o checkout-api .
./checkout-api
```

Run behind a reverse proxy (Nginx, Caddy) terminating TLS.

## Troubleshooting

**`db connect: failed to connect`** — check `DATABASE_URL`; for local Postgres
ensure the role and database both exist, and that `pg_hba.conf` allows your
auth method.

**CORS errors in the browser** — confirm the storefront / admin origin is in
`ALLOWED_ORIGINS` (exact scheme + host + port).

**Admin login fails with "not an admin account"** — the seed only inserts when
the `users` table is empty. If you registered a regular user first, promote
them in psql:

```sql
UPDATE users SET role='admin' WHERE email='you@example.com';
```

**Cart shows zero items after refresh** — `localStorage` is per-origin; make
sure you're hitting the same hostname.

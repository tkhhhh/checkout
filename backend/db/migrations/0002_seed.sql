-- Idempotent seed: only inserts when the table is empty so re-runs are safe.
-- The admin user is seeded from the ADMIN_PASSWORD env var in Go
-- (see backend/db/seed.go), not here — SQL can't bcrypt at runtime.

INSERT INTO products (sku, name, description, price_cents, stock, image_url, active)
SELECT * FROM (VALUES
  ('SKU-001', 'Classic T-Shirt',     'Soft cotton crew-neck tee.',           1999,  50, 'https://picsum.photos/seed/tshirt/640/480',  TRUE),
  ('SKU-002', 'Canvas Sneakers',     'Lightweight low-top sneakers.',         4999,  20, 'https://picsum.photos/seed/sneaker/640/480', TRUE),
  ('SKU-003', 'Leather Wallet',      'Bifold wallet, RFID blocking.',         3499,  40, 'https://picsum.photos/seed/wallet/640/480',  TRUE),
  ('SKU-004', 'Stainless Mug',       'Double-walled 12oz mug.',               1499, 100, 'https://picsum.photos/seed/mug/640/480',     TRUE),
  ('SKU-005', 'Wireless Headphones', 'Over-ear, 30h battery.',                8999,  15, 'https://picsum.photos/seed/headph/640/480',  TRUE),
  ('SKU-006', 'Notebook Set',        'Pack of 3 dotted A5 notebooks.',        1299,  80, 'https://picsum.photos/seed/notebk/640/480',  TRUE)
) AS v(sku,name,description,price_cents,stock,image_url,active)
WHERE NOT EXISTS (SELECT 1 FROM products);

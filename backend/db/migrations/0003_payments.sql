-- Payment tracking: pending orders become 'paid' via /api/orders/{id}/pay.
-- We keep a synthetic payment_ref for the receipt; real card data is not stored.

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS paid_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS payment_ref TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_ref
    ON orders(payment_ref) WHERE payment_ref IS NOT NULL;

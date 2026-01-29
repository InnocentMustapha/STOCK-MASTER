-- Add receipt_id and payment_method columns to sales table

ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS receipt_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

-- Index for faster lookup by receipt_id
CREATE INDEX IF NOT EXISTS idx_sales_receipt_id ON sales(receipt_id);

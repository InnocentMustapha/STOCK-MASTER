
-- Add initial_quantity column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS initial_quantity INTEGER DEFAULT 0;

-- Optional: Backfill existing records (assume initial = current for existing, or just 0)
-- We will default to current quantity for existing records so it's not empty, 
-- though technically we don't know the true initial for old items.
UPDATE public.products SET initial_quantity = quantity WHERE initial_quantity = 0;

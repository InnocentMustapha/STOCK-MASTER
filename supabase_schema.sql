-- Enable crypto extension for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'SELLER' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'SELLER')),
  subscription TEXT DEFAULT 'NONE' CHECK (subscription IN ('NONE', 'BASIC', 'PREMIUM')),
  subscription_expiry TIMESTAMP WITH TIME ZONE,
  trial_started_at TIMESTAMP WITH TIME ZONE,
  owner_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  initial_capital NUMERIC DEFAULT 0
);

-- Function to check if a user is an admin without recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can see names/usernames of others (needed for staff management/UI)
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles 
FOR SELECT USING (true);

-- Users can insert their own profile during signup
CREATE POLICY "Users can insert their own profile" ON public.profiles 
FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own basic info (name, username) but NOT role/subscription
-- Note: PostgreSQL doesn't support column-level RLS easily, so we handle this in the app 
-- or use a trigger. For now, we enforce that the 'role' and 'subscription' remain unchanged.
CREATE POLICY "Users can update own basic info" ON public.profiles 
FOR UPDATE USING (auth.uid() = id) 
WITH CHECK (
  auth.uid() = id AND 
  role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
  subscription = (SELECT subscription FROM public.profiles WHERE id = auth.uid())
);

-- Admins can manage their staff (create sellers, edit their info)
-- Super Admins can manage everyone
CREATE POLICY "Admins can manage staff" ON public.profiles 
FOR ALL USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.profiles(id) NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  buy_price NUMERIC,
  sell_price NUMERIC,
  quantity INTEGER DEFAULT 0,
  min_threshold INTEGER DEFAULT 5,
  discount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see products from their shop" ON public.products FOR SELECT USING (
  shop_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() OR owner_id = auth.uid()
  )
);
CREATE POLICY "Admins can manage products in their shop" ON public.products 
FOR ALL USING (
  shop_id = auth.uid() AND public.is_admin()
)
WITH CHECK (
  shop_id = auth.uid() AND public.is_admin()
);

-- 3. Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.profiles(id) NOT NULL,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT,
  quantity INTEGER,
  unit_price NUMERIC,
  total_price NUMERIC,
  total_cost NUMERIC,
  profit NUMERIC,
  seller_id UUID REFERENCES public.profiles(id),
  seller_name TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see sales from their shop" ON public.sales FOR SELECT USING (
  shop_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() OR owner_id = auth.uid()
  )
);
CREATE POLICY "Authenticated users can insert sales for their shop" ON public.sales 
FOR INSERT WITH CHECK (
  shop_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() OR owner_id = auth.uid()
  )
);

-- 4. Shop Rules Table
CREATE TABLE IF NOT EXISTS public.shop_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT,
  content TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.shop_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see rules from their shop" ON public.shop_rules FOR SELECT USING (
  shop_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() OR owner_id = auth.uid()
  )
);
CREATE POLICY "Admins can manage rules for their shop" ON public.shop_rules 
FOR ALL USING (
  shop_id = auth.uid() AND public.is_admin()
)
WITH CHECK (
  shop_id = auth.uid() AND public.is_admin()
);
-- 5. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.profiles(id) NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see categories for their shop" ON public.categories FOR SELECT USING (
  shop_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() OR owner_id = auth.uid()
  )
);
CREATE POLICY "Admins can manage categories for their shop" ON public.categories FOR ALL USING (
  shop_id = auth.uid() AND public.is_admin()
) WITH CHECK (
  shop_id = auth.uid() AND public.is_admin()
);

-- 6. Daily Records Table
CREATE TABLE IF NOT EXISTS public.daily_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.profiles(id) NOT NULL,
  date DATE NOT NULL,
  opening_balance NUMERIC DEFAULT 0,
  stock_purchases NUMERIC DEFAULT 0,
  other_expenses NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, date)
);

ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see daily records for their shop" ON public.daily_records FOR SELECT USING (
  shop_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() OR owner_id = auth.uid()
  )
);
CREATE POLICY "Admins can manage daily records for their shop" ON public.daily_records FOR ALL USING (
  shop_id = auth.uid() AND public.is_admin()
) WITH CHECK (
  shop_id = auth.uid() AND public.is_admin()
);

-- 7. Expense Logs Table
CREATE TABLE IF NOT EXISTS public.expense_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.profiles(id) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  category TEXT,
  amount NUMERIC DEFAULT 0,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.expense_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see expense logs for their shop" ON public.expense_logs FOR SELECT USING (
  shop_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() OR owner_id = auth.uid()
  )
);
CREATE POLICY "Admins can manage expense logs for their shop" ON public.expense_logs FOR ALL USING (
  shop_id = auth.uid() AND public.is_admin()
) WITH CHECK (
  shop_id = auth.uid() AND public.is_admin()
);

-- Enable Realtime for all core tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_logs;

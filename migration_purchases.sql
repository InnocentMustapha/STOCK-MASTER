-- Run this in your Supabase SQL Editor to add the missing tables for the Purchases feature

-- 1. Daily Records Table
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

CREATE POLICY "Users can see daily records for their shop" ON public.daily_records 
FOR SELECT USING (
  shop_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() OR owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage daily records for their shop" ON public.daily_records 
FOR ALL USING (
  shop_id = auth.uid() AND public.is_admin()
) 
WITH CHECK (
  shop_id = auth.uid() AND public.is_admin()
);

-- 2. Expense Logs Table
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

CREATE POLICY "Users can see expense logs for their shop" ON public.expense_logs 
FOR SELECT USING (
  shop_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() OR owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage expense logs for their shop" ON public.expense_logs 
FOR ALL USING (
  shop_id = auth.uid() AND public.is_admin()
) 
WITH CHECK (
  shop_id = auth.uid() AND public.is_admin()
);

-- 3. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_logs;

-- 4. Add initial_capital to profiles if not exists (it was missing in some schema versions)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'initial_capital') THEN
        ALTER TABLE public.profiles ADD COLUMN initial_capital NUMERIC DEFAULT 0;
    END IF;
END $$;

-- Fix RLS policies to allow Sellers (Staff) to insert/update records for their Shop
-- Also ensure Admins can access correctly

-- 1. Update Policies for DAILY RECORDS
DROP POLICY IF EXISTS "Admins can manage daily records for their shop" ON public.daily_records;
DROP POLICY IF EXISTS "Users can see daily records for their shop" ON public.daily_records;

CREATE POLICY "Shop Members can view daily records" ON public.daily_records 
FOR SELECT USING (
  shop_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() OR owner_id = auth.uid()
  )
);

CREATE POLICY "Shop Members can manage daily records" ON public.daily_records 
FOR ALL USING (
  shop_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() OR owner_id = auth.uid()
  )
)
WITH CHECK (
  shop_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() OR owner_id = auth.uid()
  )
);

-- 2. Update Policies for EXPENSE LOGS
DROP POLICY IF EXISTS "Admins can manage expense logs for their shop" ON public.expense_logs;
DROP POLICY IF EXISTS "Users can see expense logs for their shop" ON public.expense_logs;

CREATE POLICY "Shop Members can view expense logs" ON public.expense_logs 
FOR SELECT USING (
  shop_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() OR owner_id = auth.uid()
  )
);

CREATE POLICY "Shop Members can manage expense logs" ON public.expense_logs 
FOR ALL USING (
  shop_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() OR owner_id = auth.uid()
  )
)
WITH CHECK (
  shop_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() OR owner_id = auth.uid()
  )
);

-- Agent Balances Table
-- This table tracks the running balance for each agent/supplier
-- Negative balance means the shop owes the agent
-- Positive balance means the agent owes the shop (overpayment)

CREATE TABLE IF NOT EXISTS public.agent_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.profiles(id) NOT NULL,
  agent_name TEXT NOT NULL,
  balance NUMERIC DEFAULT 0, -- Negative = debt to agent, Positive = overpayment by shop
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, agent_name)
);

-- Enable RLS
ALTER TABLE public.agent_balances ENABLE ROW LEVEL SECURITY;

-- Users can see agent balances for their shop
CREATE POLICY "Users can see agent balances for their shop" ON public.agent_balances 
FOR SELECT USING (
  shop_id IN (
    SELECT id FROM public.profiles WHERE id = auth.uid() OR owner_id = auth.uid()
  )
);

-- Admins can manage agent balances for their shop
CREATE POLICY "Admins can manage agent balances for their shop" ON public.agent_balances 
FOR ALL USING (
  shop_id = auth.uid() AND public.is_admin()
) WITH CHECK (
  shop_id = auth.uid() AND public.is_admin()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_balances_shop_agent ON public.agent_balances(shop_id, agent_name);

-- Function to update agent balance
CREATE OR REPLACE FUNCTION public.update_agent_balance(
  p_shop_id UUID,
  p_agent_name TEXT,
  p_amount_change NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  -- Insert or update the agent balance
  INSERT INTO public.agent_balances (shop_id, agent_name, balance, last_updated)
  VALUES (p_shop_id, p_agent_name, p_amount_change, NOW())
  ON CONFLICT (shop_id, agent_name) 
  DO UPDATE SET 
    balance = public.agent_balances.balance + p_amount_change,
    last_updated = NOW()
  RETURNING balance INTO v_new_balance;
  
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

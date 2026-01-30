import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is missing in .env');
    }

    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    const schemaSQL = `
      -- Enable crypto extension for UUIDs if not enabled
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      -- Profiles table (extends auth.users)
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
        username TEXT UNIQUE,
        name TEXT,
        role TEXT DEFAULT 'SELLER' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'SELLER')),
        subscription TEXT DEFAULT 'NONE' CHECK (subscription IN ('NONE', 'BASIC', 'PREMIUM')),
        subscription_expiry TIMESTAMP WITH TIME ZONE,
        trial_started_at TIMESTAMP WITH TIME ZONE,
        owner_id UUID REFERENCES public.profiles(id),
        initial_capital NUMERIC DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Add initial_capital column if it doesn't exist (for existing tables)
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='initial_capital') THEN
              ALTER TABLE public.profiles ADD COLUMN initial_capital NUMERIC DEFAULT 0;
          END IF;
      END $$;

      -- Enable Row Level Security (RLS) for profiles
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      
      -- Create policies for profiles
      DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
      DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
      DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
      
      CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
      CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
      CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

      -- Products table
      CREATE TABLE IF NOT EXISTS public.products (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT UNIQUE,
        category TEXT,
        buy_price NUMERIC,
        sell_price NUMERIC,
        quantity INTEGER DEFAULT 0,
        min_threshold INTEGER DEFAULT 5,
        discount NUMERIC DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Allow read access to all users" ON public.products;
      DROP POLICY IF EXISTS "Allow write access to authenticated users" ON public.products;
      CREATE POLICY "Allow read access to all users" ON public.products FOR SELECT USING (true);
      CREATE POLICY "Allow write access to authenticated users" ON public.products FOR ALL USING (auth.role() = 'authenticated');

      -- Sales table
      CREATE TABLE IF NOT EXISTS public.sales (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        product_id UUID REFERENCES public.products(id),
        product_name TEXT,
        quantity INTEGER,
        unit_price NUMERIC,
        total_price NUMERIC,
        total_cost NUMERIC,
        profit NUMERIC,
        seller_id UUID REFERENCES public.profiles(id),
        seller_name TEXT,
        seller_name TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB
      );
      
      -- Add metadata column to sales if it doesn't exist
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='metadata') THEN
              ALTER TABLE public.sales ADD COLUMN metadata JSONB;
          END IF;
      END $$;
      ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Allow read access to all users" ON public.sales;
      DROP POLICY IF EXISTS "Allow write access to authenticated users" ON public.sales;
      CREATE POLICY "Allow read access to all users" ON public.sales FOR SELECT USING (true);
      CREATE POLICY "Allow write access to authenticated users" ON public.sales FOR ALL USING (auth.role() = 'authenticated');

      -- Shop Rules table
      CREATE TABLE IF NOT EXISTS public.shop_rules (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title TEXT,
        content TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE public.shop_rules ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Allow read access to all users" ON public.shop_rules;
      DROP POLICY IF EXISTS "Allow write access to admin" ON public.shop_rules;
      CREATE POLICY "Allow read access to all users" ON public.shop_rules FOR SELECT USING (true);
      CREATE POLICY "Allow write access to admin" ON public.shop_rules FOR ALL USING (auth.role() = 'authenticated');

      -- Subscription Requests table
      CREATE TABLE IF NOT EXISTS public.subscription_requests (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        user_name TEXT,
        tier TEXT,
        payment_method TEXT,
        phone_number TEXT,
        status TEXT DEFAULT 'PENDING',
        is_push_triggered BOOLEAN DEFAULT FALSE,
        transaction_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Users can view their own requests" ON public.subscription_requests;
      DROP POLICY IF EXISTS "Users can insert their own requests" ON public.subscription_requests;
      DROP POLICY IF EXISTS "Super admin can manage all requests" ON public.subscription_requests;

      CREATE POLICY "Users can view their own requests" ON public.subscription_requests FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY "Users can insert their own requests" ON public.subscription_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "Super admin can manage all requests" ON public.subscription_requests FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
      );

      -- Create a bucket for storage if needed (optional, skipping for now)
      -- Create Daily Records table
      CREATE TABLE IF NOT EXISTS public.daily_records (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        shop_id UUID REFERENCES public.profiles(id),
        date DATE NOT NULL,
        opening_balance NUMERIC DEFAULT 0,
        stock_purchases NUMERIC DEFAULT 0,
        other_expenses NUMERIC DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(shop_id, date)
      );

      ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Shop Isolation" ON public.daily_records;
      
      CREATE POLICY "Shop Isolation" ON public.daily_records FOR ALL 
      USING (
        shop_id = auth.uid() OR 
        shop_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid())
      );

      -- Expense Logs table
      CREATE TABLE IF NOT EXISTS public.expense_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        shop_id UUID REFERENCES public.profiles(id),
        date DATE NOT NULL,
        category TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        description TEXT,
        metadata JSONB, 
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      ALTER TABLE public.expense_logs ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Shop Expense Isolation" ON public.expense_logs;
      CREATE POLICY "Shop Expense Isolation" ON public.expense_logs FOR ALL 
      USING (
        shop_id = auth.uid() OR 
        shop_id = (SELECT owner_id FROM public.profiles WHERE id = auth.uid())
      );

      -- Add Phone to Profiles
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
    `;

    console.log('Running migration...');
    await client.query(schemaSQL);
    console.log('Migration completed successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();

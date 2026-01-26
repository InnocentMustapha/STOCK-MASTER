-- Run this in your Supabase SQL Editor
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

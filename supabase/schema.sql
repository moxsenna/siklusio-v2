-- Supabase SQL Schema for Cycle Tracking App

-- Create profiles table to store user settings and preferences
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  nickname TEXT,
  whatsapp_number TEXT,
  birth_date DATE,
  children_count TEXT,
  last_period_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cycle_length INTEGER NOT NULL DEFAULT 28,
  period_length INTEGER NOT NULL DEFAULT 5,
  husband_name TEXT DEFAULT 'Sayang',
  husband_nickname TEXT DEFAULT 'Sayang',
  husband_number TEXT DEFAULT '',
  target_saving NUMERIC DEFAULT 25000000,
  current_saving NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Create a trigger to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    name, 
    nickname,
    whatsapp_number, 
    birth_date,
    children_count
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'nickname',
    new.raw_user_meta_data->>'whatsapp',
    (new.raw_user_meta_data->>'birth_date')::date,
    new.raw_user_meta_data->>'children_count'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Create activity_history table for daily logs
CREATE TABLE public.activity_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date_key DATE NOT NULL,
  is_period BOOLEAN DEFAULT FALSE,
  symptoms JSONB DEFAULT '[]'::jsonb, -- Store array of symptom strings
  tasks JSONB DEFAULT '[]'::jsonb, -- Store array of Task objects
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, date_key) -- Ensure only one record per user per day
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_history_updated_at ON public.activity_history;
CREATE TRIGGER trg_activity_history_updated_at
  BEFORE UPDATE ON public.activity_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS for activity_history
ALTER TABLE public.activity_history ENABLE ROW LEVEL SECURITY;

-- Activity History Policies
CREATE POLICY "Users can view own activity history" 
  ON public.activity_history FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity history" 
  ON public.activity_history FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity history" 
  ON public.activity_history FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity history" 
  ON public.activity_history FOR DELETE 
  USING (auth.uid() = user_id);

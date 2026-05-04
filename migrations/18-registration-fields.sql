-- =============================================
-- Migration 18: Registration fields
-- Adds CPF, requested store name and profile status for the registration flow.
-- =============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS requested_store_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_key
  ON public.profiles (cpf)
  WHERE cpf IS NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('active', 'pending_store_approval'));

CREATE INDEX IF NOT EXISTS idx_profiles_status
  ON public.profiles (status);

CREATE INDEX IF NOT EXISTS idx_profiles_requested_store_name
  ON public.profiles (requested_store_name)
  WHERE requested_store_name IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_store TEXT := NULLIF(BTRIM(NEW.raw_user_meta_data->>'requested_store_name'), '');
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    whatsapp,
    cpf,
    role,
    total_points,
    store_id,
    requested_store_name,
    status
  )
  VALUES (
    NEW.id,
    COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'Unnamed'),
    NEW.email,
    COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data->>'whatsapp'), ''), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'cpf'), ''),
    'user',
    0,
    NULLIF(NEW.raw_user_meta_data->>'store_id', '')::UUID,
    requested_store,
    CASE
      WHEN requested_store IS NULL THEN 'active'
      ELSE 'pending_store_approval'
    END
  );

  RETURN NEW;
END;
$$;

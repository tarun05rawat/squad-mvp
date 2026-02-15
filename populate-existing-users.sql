-- Populate users table for existing auth users
-- Run this in Supabase SQL Editor to backfill existing users

-- Insert all auth users into the users table
INSERT INTO public.users (id, email, full_name, created_at)
SELECT
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    SPLIT_PART(au.email, '@', 1),
    'User'
  ) as full_name,
  au.created_at
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, public.users.full_name);

-- Verify the users were populated
SELECT id, email, full_name, created_at
FROM public.users
ORDER BY created_at DESC;

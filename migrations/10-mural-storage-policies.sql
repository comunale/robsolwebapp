-- Migration 10: Create mural-slides storage bucket and RLS policies
-- Root cause of the 403 error: the bucket was referenced in code but never
-- provisioned in Supabase, so the default-deny storage RLS blocked all writes.
--
-- Run this in the Supabase SQL Editor.

-- 1. Create the bucket (public = true so slide images can be read by all users)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mural-slides',
  'mural-slides',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880;

-- 2. Public SELECT (anyone can view slide images in the carousel)
CREATE POLICY "Public can view mural slides"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'mural-slides');

-- 3. Admin INSERT (only admins can upload new slides)
CREATE POLICY "Admins can upload mural slides"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'mural-slides'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Admin UPDATE (overwrite / replace existing slide images)
CREATE POLICY "Admins can update mural slides"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'mural-slides'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Admin DELETE (remove old slide images when a slide is deleted)
CREATE POLICY "Admins can delete mural slides"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'mural-slides'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

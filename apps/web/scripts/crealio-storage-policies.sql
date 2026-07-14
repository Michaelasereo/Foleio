-- Foleio Supabase Storage: avatars + banners on bucket `crealio`
-- Safe to re-run. Same bucket as banner covers; folders: avatars/, banners/, images/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crealio',
  'crealio',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view uploaded files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access crealio" ON storage.objects;

-- Anyone can view (avatars + banners need public URLs)
CREATE POLICY "Public can view uploaded files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'crealio');

-- Auth users can upload under avatars/<auth-uid>/ or banners/<auth-uid>/
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'crealio'
  AND (storage.foldername(name))[1] IN ('avatars', 'banners', 'images')
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'crealio'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'crealio'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Verify
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id = 'crealio';

SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

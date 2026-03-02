-- Storage bucket for COG thumbnail images
INSERT INTO storage.buckets (id, name, public)
VALUES ('cog-thumbnails', 'cog-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload thumbnails
CREATE POLICY "Authenticated users can upload thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cog-thumbnails');

-- Allow public read access to thumbnails
CREATE POLICY "Public read access for thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'cog-thumbnails');

-- ============================================
-- Fix: cog_images INSERT RLS 정책 수정
-- auth.role() → auth.uid() IS NOT NULL
-- ============================================

DROP POLICY "Authenticated users can insert COG images" ON public.cog_images;

CREATE POLICY "Authenticated users can insert COG images"
  ON public.cog_images FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

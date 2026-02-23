-- ============================================
-- COGnito v0.3.0 카탈로그 고도화
-- 구조화 메타데이터 + 태그
-- ============================================

ALTER TABLE public.cog_images
  ADD COLUMN captured_at timestamptz,
  ADD COLUMN region text,
  ADD COLUMN sensor text,
  ADD COLUMN resolution double precision,
  ADD COLUMN tags text[] DEFAULT '{}';

CREATE INDEX idx_cog_images_captured_at ON public.cog_images(captured_at DESC);
CREATE INDEX idx_cog_images_region ON public.cog_images(region);
CREATE INDEX idx_cog_images_sensor ON public.cog_images(sensor);
CREATE INDEX idx_cog_images_tags ON public.cog_images USING GIN(tags);

-- ============================================
-- cog_images 테이블에 user_id 컬럼 추가
-- 등록자 기반 필터링 및 소유자 확인용
-- ============================================

-- user_id 컬럼 추가 (기존 데이터는 NULL 허용)
ALTER TABLE public.cog_images
  ADD COLUMN user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- INSERT 시 auth.uid() 자동 설정
ALTER TABLE public.cog_images
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 인덱스 추가
CREATE INDEX idx_cog_images_user_id ON public.cog_images(user_id);

-- UPDATE/DELETE RLS 정책 (소유자만 가능)
CREATE POLICY "Owner can update own COG images"
  ON public.cog_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can delete own COG images"
  ON public.cog_images FOR DELETE
  USING (auth.uid() = user_id);

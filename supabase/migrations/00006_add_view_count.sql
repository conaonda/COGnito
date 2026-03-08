-- ============================================
-- cog_images 테이블에 view_count 컬럼 추가
-- 카탈로그 영상 조회수 기록용
-- ============================================

-- view_count 컬럼 추가
ALTER TABLE public.cog_images
  ADD COLUMN view_count integer DEFAULT 0 NOT NULL;

-- RPC 함수: 조회수 1 증가 (비로그인 사용자도 호출 가능)
CREATE OR REPLACE FUNCTION public.increment_view_count(image_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.cog_images
  SET view_count = view_count + 1
  WHERE id = image_id;
$$;

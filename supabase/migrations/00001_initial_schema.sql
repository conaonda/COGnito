-- ============================================
-- COGnito v0.2.0 Initial Schema
-- ============================================

-- 1. profiles (auth.users 미러링, public 접근용)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  provider text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- 사용자 가입 시 자동으로 profile 생성
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, provider, display_name, avatar_url)
  values (
    new.id,
    new.raw_app_meta_data->>'provider',
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'user_name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. cog_images (COG 영상 카탈로그)
create table public.cog_images (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  title text,
  description text,
  source_type text check (source_type in ('stac', 'manual')) default 'manual',
  crs text,
  bands integer[],
  bbox double precision[4],
  thumbnail_url text,
  metadata_json jsonb,
  created_at timestamptz default now() not null
);

-- 3. likes (좋아요)
create table public.likes (
  user_id uuid references public.profiles(id) on delete cascade not null,
  cog_image_id uuid references public.cog_images(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key (user_id, cog_image_id)
);

-- 4. watchlists (관심 목록)
create table public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now() not null
);

-- 5. watchlist_items (관심 목록 항목)
create table public.watchlist_items (
  watchlist_id uuid references public.watchlists(id) on delete cascade not null,
  cog_image_id uuid references public.cog_images(id) on delete cascade not null,
  added_at timestamptz default now() not null,
  primary key (watchlist_id, cog_image_id)
);

-- ============================================
-- Indexes
-- ============================================
create index idx_cog_images_source_type on public.cog_images(source_type);
create index idx_cog_images_created_at on public.cog_images(created_at desc);
create index idx_likes_cog_image_id on public.likes(cog_image_id);
create index idx_watchlists_user_id on public.watchlists(user_id);
create index idx_watchlist_items_cog_image_id on public.watchlist_items(cog_image_id);

-- ============================================
-- Row Level Security
-- ============================================

-- profiles: 누구나 읽기, 본인만 수정
alter table public.profiles enable row level security;
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- cog_images: 누구나 읽기, 인증된 사용자만 등록
alter table public.cog_images enable row level security;
create policy "COG images are viewable by everyone"
  on public.cog_images for select using (true);
create policy "Authenticated users can insert COG images"
  on public.cog_images for insert with check (auth.role() = 'authenticated');

-- likes: 누구나 읽기, 본인만 추가/삭제
alter table public.likes enable row level security;
create policy "Likes are viewable by everyone"
  on public.likes for select using (true);
create policy "Users can insert own likes"
  on public.likes for insert with check (auth.uid() = user_id);
create policy "Users can delete own likes"
  on public.likes for delete using (auth.uid() = user_id);

-- watchlists: 본인만 접근
alter table public.watchlists enable row level security;
create policy "Users can view own watchlists"
  on public.watchlists for select using (auth.uid() = user_id);
create policy "Users can insert own watchlists"
  on public.watchlists for insert with check (auth.uid() = user_id);
create policy "Users can update own watchlists"
  on public.watchlists for update using (auth.uid() = user_id);
create policy "Users can delete own watchlists"
  on public.watchlists for delete using (auth.uid() = user_id);

-- watchlist_items: 본인 watchlist의 항목만 접근
alter table public.watchlist_items enable row level security;
create policy "Users can view own watchlist items"
  on public.watchlist_items for select
  using (exists (
    select 1 from public.watchlists w
    where w.id = watchlist_id and w.user_id = auth.uid()
  ));
create policy "Users can insert items to own watchlists"
  on public.watchlist_items for insert
  with check (exists (
    select 1 from public.watchlists w
    where w.id = watchlist_id and w.user_id = auth.uid()
  ));
create policy "Users can delete items from own watchlists"
  on public.watchlist_items for delete
  using (exists (
    select 1 from public.watchlists w
    where w.id = watchlist_id and w.user_id = auth.uid()
  ));

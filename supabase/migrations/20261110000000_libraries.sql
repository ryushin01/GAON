-- 로그인한 사람마다 보관함(좋아요, 최근 재생, 플레이리스트)을 한 줄로 저장합니다.
create table public.libraries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  -- 보관함 하나가 지나치게 커지지 않게 막습니다.
  constraint libraries_data_size check (octet_length(data::text) < 262144)
);

alter table public.libraries enable row level security;

-- 자기 보관함만 읽고 쓸 수 있습니다.
create policy "본인 보관함 읽기" on public.libraries for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "본인 보관함 만들기" on public.libraries for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "본인 보관함 고치기" on public.libraries for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 저장할 때마다 서버 시각을 기록해 기기 사이의 선후를 가립니다.
create function public.touch_library() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger libraries_touch before insert or update on public.libraries
  for each row execute function public.touch_library();

-- 앱 안에서 계정을 지웁니다. 보관함은 외래 키로 함께 지워집니다.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from auth.users where id = (select auth.uid());
end $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- STN 스킬업 관리자용 Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에서 실행하세요.

-- 결제/수강 신청 테이블
create table if not exists public.payment_applications (
  id uuid primary key default gen_random_uuid(),
  order_id text unique,
  applicant_name text not null,
  applicant_phone text,
  applicant_email text,
  referrer text,
  program_name text,
  tier text,
  amount integer,
  pay_method text,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_applications_created_at_idx
  on public.payment_applications (created_at desc);

create index if not exists payment_applications_status_idx
  on public.payment_applications (status);

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists payment_applications_set_updated_at on public.payment_applications;
create trigger payment_applications_set_updated_at
before update on public.payment_applications
for each row execute function public.set_updated_at();

-- RLS 활성화
alter table public.payment_applications enable row level security;

-- 로그인한 관리자만 조회/수정 가능
drop policy if exists "admin read payment_applications" on public.payment_applications;
create policy "admin read payment_applications"
on public.payment_applications
for select
to authenticated
using (true);

drop policy if exists "admin insert payment_applications" on public.payment_applications;
create policy "admin insert payment_applications"
on public.payment_applications
for insert
to authenticated
with check (true);

drop policy if exists "admin update payment_applications" on public.payment_applications;
create policy "admin update payment_applications"
on public.payment_applications
for update
to authenticated
using (true)
with check (true);

-- 공개 결제 페이지에서 신청 저장 (anon)
drop policy if exists "public insert payment_applications" on public.payment_applications;
create policy "public insert payment_applications"
on public.payment_applications
for insert
to anon
with check (true);

-- 이름+연락처 결제 조회 (anon, RPC 전용)
create or replace function public.lookup_payment(p_name text, p_phone text)
returns table (
  order_id text,
  applicant_name text,
  applicant_phone text,
  program_name text,
  tier text,
  amount integer,
  pay_method text,
  status text,
  referrer text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  v_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');

  return query
  select
    pa.order_id,
    pa.applicant_name,
    pa.applicant_phone,
    pa.program_name,
    pa.tier,
    pa.amount,
    pa.pay_method,
    pa.status,
    pa.referrer,
    pa.created_at
  from public.payment_applications pa
  where trim(pa.applicant_name) = trim(p_name)
    and regexp_replace(coalesce(pa.applicant_phone, ''), '[^0-9]', '', 'g') = v_phone
  order by pa.created_at desc
  limit 20;
end;
$$;

grant execute on function public.lookup_payment(text, text) to anon, authenticated;

-- 페이지 방문 기록
create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  page_path text not null,
  page_title text,
  referrer text,
  visitor_id text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx
  on public.page_views (created_at desc);

create index if not exists page_views_page_path_idx
  on public.page_views (page_path);

alter table public.page_views enable row level security;

-- 공개 사이트에서 방문 기록 저장 (anon)
drop policy if exists "public insert page_views" on public.page_views;
create policy "public insert page_views"
on public.page_views
for insert
to anon
with check (true);

-- 관리자만 방문 기록 조회
drop policy if exists "admin read page_views" on public.page_views;
create policy "admin read page_views"
on public.page_views
for select
to authenticated
using (true);

-- 추천인 할인 코드
create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  max_uses integer,
  used_count integer not null default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists referral_codes_code_idx on public.referral_codes (upper(code));
create index if not exists referral_codes_active_idx on public.referral_codes (is_active);

drop trigger if exists referral_codes_set_updated_at on public.referral_codes;
create trigger referral_codes_set_updated_at
before update on public.referral_codes
for each row execute function public.set_updated_at();

alter table public.referral_codes enable row level security;

drop policy if exists "admin read referral_codes" on public.referral_codes;
create policy "admin read referral_codes"
on public.referral_codes for select to authenticated using (true);

drop policy if exists "admin insert referral_codes" on public.referral_codes;
create policy "admin insert referral_codes"
on public.referral_codes for insert to authenticated with check (true);

drop policy if exists "admin update referral_codes" on public.referral_codes;
create policy "admin update referral_codes"
on public.referral_codes for update to authenticated using (true) with check (true);

drop policy if exists "admin delete referral_codes" on public.referral_codes;
create policy "admin delete referral_codes"
on public.referral_codes for delete to authenticated using (true);

-- 결제 페이지 코드 검증 (anon 호출 가능)
create or replace function public.validate_referral_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.referral_codes%rowtype;
begin
  select * into r
  from public.referral_codes
  where upper(code) = upper(trim(p_code))
    and is_active = true;

  if not found then
    return json_build_object('valid', false, 'message', '유효하지 않은 코드입니다.');
  end if;

  if r.valid_from is not null and r.valid_from > now() then
    return json_build_object('valid', false, 'message', '아직 사용할 수 없는 코드입니다.');
  end if;

  if r.valid_until is not null and r.valid_until < now() then
    return json_build_object('valid', false, 'message', '만료된 코드입니다.');
  end if;

  if r.max_uses is not null and r.used_count >= r.max_uses then
    return json_build_object('valid', false, 'message', '사용 횟수가 초과되었습니다.');
  end if;

  return json_build_object(
    'valid', true,
    'code', r.code,
    'label', r.label,
    'discount_type', r.discount_type,
    'discount_value', r.discount_value
  );
end;
$$;

grant execute on function public.validate_referral_code(text) to anon, authenticated;

-- 추천인 코드 사용 횟수 증가 (결제 저장 후 anon 호출)
create or replace function public.increment_referral_usage(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.referral_codes%rowtype;
begin
  select * into r
  from public.referral_codes
  where upper(code) = upper(trim(p_code))
  for update;

  if not found then
    return json_build_object('ok', false, 'message', '코드를 찾을 수 없습니다.');
  end if;

  if not r.is_active then
    return json_build_object('ok', false, 'message', '비활성화된 코드입니다.');
  end if;

  if r.valid_from is not null and r.valid_from > now() then
    return json_build_object('ok', false, 'message', '아직 사용할 수 없는 코드입니다.');
  end if;

  if r.valid_until is not null and r.valid_until < now() then
    return json_build_object('ok', false, 'message', '만료된 코드입니다.');
  end if;

  if r.max_uses is not null and r.used_count >= r.max_uses then
    return json_build_object('ok', false, 'message', '사용 횟수가 초과되었습니다.');
  end if;

  update public.referral_codes
  set used_count = used_count + 1
  where id = r.id;

  return json_build_object(
    'ok', true,
    'code', r.code,
    'used_count', r.used_count + 1
  );
end;
$$;

grant execute on function public.increment_referral_usage(text) to anon, authenticated;

-- 관리자 계정은 Supabase Auth → Users 에서 직접 생성하세요.
-- Authentication → Users → Add user (email/password)

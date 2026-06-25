-- Supabase SQL Editor에서 한 번 실행하세요.
-- 결제 저장(RLS) + 조회 RPC가 동작하지 않을 때 적용합니다.

-- anon 직접 insert (RPC 미사용 클라이언트 대비)
drop policy if exists "public insert payment_applications" on public.payment_applications;
create policy "public insert payment_applications"
on public.payment_applications
for insert
to anon
with check (true);

-- 이름+연락처 조회
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

-- 결제 완료 저장 (권장 경로)
create or replace function public.save_payment_application(
  p_order_id text,
  p_applicant_name text,
  p_applicant_phone text,
  p_applicant_email text default null,
  p_referrer text default null,
  p_program_name text default null,
  p_tier text default null,
  p_amount integer default 0,
  p_pay_method text default null,
  p_status text default 'pending',
  p_notes text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_row public.payment_applications%rowtype;
begin
  if coalesce(trim(p_order_id), '') = '' then
    return json_build_object('ok', false, 'message', 'order_id required');
  end if;

  v_phone := regexp_replace(coalesce(p_applicant_phone, ''), '[^0-9]', '', 'g');

  insert into public.payment_applications (
    order_id,
    applicant_name,
    applicant_phone,
    applicant_email,
    referrer,
    program_name,
    tier,
    amount,
    pay_method,
    status,
    notes
  ) values (
    trim(p_order_id),
    coalesce(nullif(trim(p_applicant_name), ''), '-'),
    nullif(v_phone, ''),
    nullif(trim(coalesce(p_applicant_email, '')), ''),
    nullif(trim(coalesce(p_referrer, '')), ''),
    coalesce(nullif(trim(coalesce(p_program_name, '')), ''), 'STN 스킬업 양성과정'),
    nullif(trim(coalesce(p_tier, '')), ''),
    coalesce(p_amount, 0),
    nullif(trim(coalesce(p_pay_method, '')), ''),
    coalesce(nullif(trim(coalesce(p_status, '')), ''), 'pending'),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  on conflict (order_id) do update set
    applicant_name = case
      when excluded.applicant_name is not null and excluded.applicant_name <> '-'
        then excluded.applicant_name
      else payment_applications.applicant_name
    end,
    applicant_phone = coalesce(nullif(excluded.applicant_phone, ''), payment_applications.applicant_phone),
    applicant_email = coalesce(excluded.applicant_email, payment_applications.applicant_email),
    referrer = coalesce(excluded.referrer, payment_applications.referrer),
    program_name = coalesce(excluded.program_name, payment_applications.program_name),
    tier = coalesce(excluded.tier, payment_applications.tier),
    amount = case when excluded.amount > 0 then excluded.amount else payment_applications.amount end,
    pay_method = coalesce(excluded.pay_method, payment_applications.pay_method),
    status = excluded.status,
    notes = coalesce(excluded.notes, payment_applications.notes),
    updated_at = now()
  returning * into v_row;

  return json_build_object('ok', true, 'order_id', v_row.order_id);
end;
$$;

grant execute on function public.save_payment_application(
  text, text, text, text, text, text, text, integer, text, text, text
) to anon, authenticated;

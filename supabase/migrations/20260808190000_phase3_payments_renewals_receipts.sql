do $$ begin
  create type public.application_status as enum ('pending','approved','rejected','suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending','successful','failed','cancelled','refunded');
exception when duplicate_object then null; end $$;

alter table public.membership_applications alter column status drop default;
alter table public.membership_applications
  alter column status type public.application_status
  using (
    case status::text
      when 'active' then 'approved'
      when 'rejected' then 'rejected'
      when 'suspended' then 'suspended'
      else 'pending'
    end
  )::public.application_status;
alter table public.membership_applications alter column status set default 'pending'::public.application_status;

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'flutterwave' check (provider in ('flutterwave')),
  tx_ref text not null unique,
  provider_transaction_id text,
  amount numeric(10,2) not null default 100.00 check (amount > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  status public.payment_status not null default 'pending',
  checkout_url text,
  payment_type text,
  verified_at timestamptz,
  paid_at timestamptz,
  failure_reason text,
  raw_verification jsonb
);
create unique index if not exists payment_transactions_provider_id_uidx
  on public.payment_transactions(provider, provider_transaction_id)
  where provider_transaction_id is not null;
create index if not exists payment_transactions_user_created_idx
  on public.payment_transactions(user_id, created_at desc);
create index if not exists payment_transactions_status_created_idx
  on public.payment_transactions(status, created_at desc);

create sequence if not exists public.uro_receipt_number_seq;
create table if not exists public.membership_receipts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  membership_id uuid not null unique references public.memberships(id) on delete restrict,
  payment_id uuid not null unique references public.payment_transactions(id) on delete restrict,
  receipt_number text not null unique,
  amount numeric(10,2) not null,
  currency text not null,
  payment_reference text not null,
  provider text not null,
  issued_at timestamptz not null default now()
);
create index if not exists membership_receipts_user_created_idx
  on public.membership_receipts(user_id, created_at desc);

alter table public.payment_transactions enable row level security;
alter table public.membership_receipts enable row level security;
create policy "payments_select_own_or_staff" on public.payment_transactions
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff());
create policy "receipts_select_own_or_staff" on public.membership_receipts
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff());
revoke all on public.payment_transactions from anon, authenticated;
grant select on public.payment_transactions to authenticated;
revoke all on public.membership_receipts from anon, authenticated;
grant select on public.membership_receipts to authenticated;

drop trigger if exists payment_transactions_touch_updated_at on public.payment_transactions;
create trigger payment_transactions_touch_updated_at
  before update on public.payment_transactions
  for each row execute function public.touch_updated_at();

drop function if exists public.review_membership_application(uuid,public.membership_status,text);
create or replace function public.review_membership_application(
  p_application_id uuid,
  p_status public.application_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path=public,private
as $$
declare applicant_user_id uuid;
begin
  if not private.is_staff() then raise exception 'Not authorised'; end if;
  update public.membership_applications
     set status=p_status, review_note=nullif(trim(p_note),''), reviewed_at=now(), reviewed_by=auth.uid()
   where id=p_application_id
   returning user_id into applicant_user_id;
  if not found then raise exception 'Application not found'; end if;
  if applicant_user_id is not null then
    update public.profiles
       set membership_status=case
         when p_status='rejected'::public.application_status then 'rejected'::public.membership_status
         when p_status='suspended'::public.application_status then 'suspended'::public.membership_status
         when p_status='pending'::public.application_status and membership_status <> 'active'::public.membership_status then 'pending'::public.membership_status
         when p_status='approved'::public.application_status and membership_status <> 'active'::public.membership_status then 'pending'::public.membership_status
         else membership_status
       end, updated_at=now()
     where id=applicant_user_id;
  end if;
end;
$$;
revoke execute on function public.review_membership_application(uuid,public.application_status,text) from public,anon;
grant execute on function public.review_membership_application(uuid,public.application_status,text) to authenticated;

create or replace function public.finalize_membership_payment(
  p_tx_ref text,
  p_provider_transaction_id text,
  p_amount numeric,
  p_currency text,
  p_payment_type text,
  p_verification jsonb default '{}'::jsonb
)
returns table(membership_id uuid, receipt_id uuid, receipt_number text, period_start date, period_end date)
language plpgsql
security definer
set search_path=public
as $$
declare
  payment_row public.payment_transactions%rowtype;
  existing_receipt public.membership_receipts%rowtype;
  new_membership_id uuid;
  new_receipt_id uuid;
  new_receipt_number text;
  start_date date;
  end_date date;
  prior_end date;
begin
  select * into payment_row from public.payment_transactions where tx_ref=p_tx_ref for update;
  if not found then raise exception 'Payment reference not found'; end if;
  select * into existing_receipt from public.membership_receipts where payment_id=payment_row.id;
  if found then
    return query select existing_receipt.membership_id, existing_receipt.id, existing_receipt.receipt_number, m.period_start, m.period_end
      from public.memberships m where m.id=existing_receipt.membership_id;
    return;
  end if;
  if upper(coalesce(p_currency,'')) <> 'USD' then raise exception 'Unexpected payment currency'; end if;
  if p_amount < payment_row.amount or payment_row.amount <> 100.00 then raise exception 'Unexpected payment amount'; end if;
  if payment_row.currency <> 'USD' then raise exception 'Payment record currency mismatch'; end if;
  select max(m.period_end) into prior_end from public.memberships m
    where m.user_id=payment_row.user_id and m.status='active'::public.membership_status;
  if prior_end is not null and prior_end >= current_date then start_date:=prior_end+1; else start_date:=current_date; end if;
  end_date:=(start_date+interval '1 year'-interval '1 day')::date;
  insert into public.memberships(user_id,status,amount_usd,period_start,period_end,paid_at,payment_reference)
    values(payment_row.user_id,'active',payment_row.amount,start_date,end_date,now(),p_tx_ref)
    returning id into new_membership_id;
  update public.payment_transactions set provider_transaction_id=nullif(trim(p_provider_transaction_id),''), status='successful',
    payment_type=nullif(trim(p_payment_type),''), verified_at=now(), paid_at=now(), failure_reason=null,
    raw_verification=p_verification, updated_at=now() where id=payment_row.id;
  update public.profiles set membership_status='active', membership_expires_at=end_date::timestamptz+interval '23 hours 59 minutes 59 seconds', updated_at=now()
    where id=payment_row.user_id;
  new_receipt_number:='URO-'||to_char(current_date,'YYYY')||'-'||lpad(nextval('public.uro_receipt_number_seq')::text,6,'0');
  insert into public.membership_receipts(user_id,membership_id,payment_id,receipt_number,amount,currency,payment_reference,provider,issued_at)
    values(payment_row.user_id,new_membership_id,payment_row.id,new_receipt_number,payment_row.amount,payment_row.currency,p_tx_ref,payment_row.provider,now())
    returning id into new_receipt_id;
  return query select new_membership_id,new_receipt_id,new_receipt_number,start_date,end_date;
end;
$$;
revoke execute on function public.finalize_membership_payment(text,text,numeric,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.finalize_membership_payment(text,text,numeric,text,text,jsonb) to service_role;

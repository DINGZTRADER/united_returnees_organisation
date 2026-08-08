create extension if not exists "pgcrypto";

do $$ begin create type public.membership_status as enum ('pending','active','expired','suspended','rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type public.return_status as enum ('planning','returned'); exception when duplicate_object then null; end $$;
do $$ begin create type public.user_role as enum ('member','staff','admin'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  email text not null, full_name text not null, phone text,
  role public.user_role not null default 'member', current_country text,
  return_status public.return_status, return_date date, district text,
  professional_background text, skills text, business_interests text,
  investment_interests text, support_needs text,
  membership_status public.membership_status not null default 'pending',
  membership_expires_at timestamptz
);
create unique index if not exists profiles_email_lower_uidx on public.profiles(lower(email));

create table if not exists public.membership_applications (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null, full_name text not null, email text not null, phone text not null,
  current_country text not null, return_status public.return_status not null, return_date date, district text,
  professional_background text, skills text, support_needs text not null, consent text not null default 'yes', consented_at timestamptz not null default now(),
  status public.membership_status not null default 'pending', reviewed_at timestamptz, reviewed_by uuid references public.profiles(id) on delete set null, review_note text
);
create index if not exists membership_applications_user_idx on public.membership_applications(user_id);
create index if not exists membership_applications_status_created_idx on public.membership_applications(status, created_at desc);
create index if not exists membership_applications_email_lower_idx on public.membership_applications(lower(email));

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  member_id uuid not null references public.profiles(id) on delete cascade, category text not null, subject text not null, details text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  assigned_to uuid references public.profiles(id) on delete set null, resolution_note text
);
create index if not exists support_requests_member_created_idx on public.support_requests(member_id, created_at desc);
create index if not exists support_requests_status_created_idx on public.support_requests(status, created_at desc);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  title text not null, category text not null, summary text not null, source_url text, expires_at timestamptz, published boolean not null default false
);
create index if not exists opportunities_published_created_idx on public.opportunities(published, created_at desc);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), user_id uuid not null references public.profiles(id) on delete cascade,
  status public.membership_status not null default 'pending', amount_usd numeric(10,2) not null default 100.00,
  period_start date, period_end date, paid_at timestamptz, payment_reference text, unique(user_id, period_start)
);
create index if not exists memberships_user_idx on public.memberships(user_id, created_at desc);
create index if not exists memberships_status_idx on public.memberships(status);

create or replace function public.touch_updated_at() returns trigger language plpgsql security invoker set search_path=public as $$ begin new.updated_at=now(); return new; end; $$;

drop trigger if exists profiles_touch_updated_at on public.profiles; create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists membership_applications_touch_updated_at on public.membership_applications; create trigger membership_applications_touch_updated_at before update on public.membership_applications for each row execute function public.touch_updated_at();
drop trigger if exists support_requests_touch_updated_at on public.support_requests; create trigger support_requests_touch_updated_at before update on public.support_requests for each row execute function public.touch_updated_at();
drop trigger if exists opportunities_touch_updated_at on public.opportunities; create trigger opportunities_touch_updated_at before update on public.opportunities for each row execute function public.touch_updated_at();

create or replace function public.current_user_role() returns public.user_role language sql stable security definer set search_path=public as $$ select role from public.profiles where id=auth.uid(); $$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$ select coalesce(public.current_user_role() in ('staff'::public.user_role,'admin'::public.user_role),false); $$;

create or replace function public.handle_new_auth_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,full_name,phone) values(new.id,lower(coalesce(new.email,'')),coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),split_part(coalesce(new.email,'member'),'@',1)),nullif(trim(new.raw_user_meta_data->>'phone'),''))
  on conflict(id) do update set email=excluded.email,full_name=coalesce(nullif(public.profiles.full_name,''),excluded.full_name),updated_at=now();
  update public.membership_applications set user_id=new.id where user_id is null and lower(email)=lower(coalesce(new.email,''));
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users; create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

create or replace function public.submit_membership_application(p_user_id uuid,p_full_name text,p_email text,p_phone text,p_current_country text,p_return_status public.return_status,p_return_date date,p_district text,p_professional_background text,p_skills text,p_support_needs text)
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare application_id uuid;
begin
  if p_user_id is not null and not exists(select 1 from auth.users u where u.id=p_user_id and lower(u.email)=lower(trim(p_email))) then raise exception 'Applicant identity does not match the account email'; end if;
  insert into public.membership_applications(user_id,full_name,email,phone,current_country,return_status,return_date,district,professional_background,skills,support_needs,consent,consented_at,status)
  values(p_user_id,trim(p_full_name),lower(trim(p_email)),trim(p_phone),trim(p_current_country),p_return_status,p_return_date,nullif(trim(p_district),''),nullif(trim(p_professional_background),''),nullif(trim(p_skills),''),trim(p_support_needs),'yes',now(),'pending') returning id into application_id;
  if p_user_id is not null then update public.profiles set full_name=trim(p_full_name),phone=trim(p_phone),current_country=trim(p_current_country),return_status=p_return_status,return_date=p_return_date,district=nullif(trim(p_district),''),professional_background=nullif(trim(p_professional_background),''),skills=nullif(trim(p_skills),''),support_needs=trim(p_support_needs),updated_at=now() where id=p_user_id; end if;
  return application_id;
end; $$;

create or replace function public.review_membership_application(p_application_id uuid,p_status public.membership_status,p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare applicant_user_id uuid;
begin
  if not public.is_staff() then raise exception 'Not authorised'; end if;
  if p_status not in ('pending'::public.membership_status,'active'::public.membership_status,'rejected'::public.membership_status,'suspended'::public.membership_status) then raise exception 'Unsupported review status'; end if;
  update public.membership_applications set status=p_status,review_note=nullif(trim(p_note),''),reviewed_at=now(),reviewed_by=auth.uid() where id=p_application_id returning user_id into applicant_user_id;
  if not found then raise exception 'Application not found'; end if;
  if applicant_user_id is not null then update public.profiles set membership_status=p_status,updated_at=now() where id=applicant_user_id; end if;
end; $$;

alter table public.profiles enable row level security; alter table public.membership_applications enable row level security; alter table public.support_requests enable row level security; alter table public.opportunities enable row level security; alter table public.memberships enable row level security;
create policy "profiles_select_own_or_staff" on public.profiles for select to authenticated using(auth.uid()=id or public.is_staff());
create policy "profiles_update_own" on public.profiles for update to authenticated using(auth.uid()=id) with check(auth.uid()=id);
create policy "applications_select_own_or_staff" on public.membership_applications for select to authenticated using(user_id=auth.uid() or public.is_staff());
create policy "support_select_own_or_staff" on public.support_requests for select to authenticated using(member_id=auth.uid() or public.is_staff());
create policy "support_insert_own" on public.support_requests for insert to authenticated with check(member_id=auth.uid());
create policy "support_update_staff" on public.support_requests for update to authenticated using(public.is_staff()) with check(public.is_staff());
create policy "opportunities_public_read" on public.opportunities for select to anon,authenticated using(published=true or public.is_staff());
create policy "opportunities_staff_insert" on public.opportunities for insert to authenticated with check(public.is_staff());
create policy "opportunities_staff_update" on public.opportunities for update to authenticated using(public.is_staff()) with check(public.is_staff());
create policy "opportunities_staff_delete" on public.opportunities for delete to authenticated using(public.is_staff());
create policy "memberships_select_own_or_staff" on public.memberships for select to authenticated using(user_id=auth.uid() or public.is_staff());

revoke all on public.profiles from anon,authenticated; grant select on public.profiles to authenticated; grant update(full_name,phone,current_country,return_status,return_date,district,professional_background,skills,business_interests,investment_interests,support_needs) on public.profiles to authenticated;
revoke all on public.membership_applications from anon,authenticated; grant select on public.membership_applications to authenticated;
revoke all on public.support_requests from anon,authenticated; grant select,insert,update on public.support_requests to authenticated;
revoke all on public.opportunities from anon,authenticated; grant select on public.opportunities to anon,authenticated; grant insert,update,delete on public.opportunities to authenticated;
revoke all on public.memberships from anon,authenticated; grant select on public.memberships to authenticated;
grant execute on function public.submit_membership_application(uuid,text,text,text,text,public.return_status,date,text,text,text,text) to anon,authenticated;
grant execute on function public.review_membership_application(uuid,public.membership_status,text) to authenticated;

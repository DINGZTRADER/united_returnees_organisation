create unique index if not exists membership_applications_one_per_user_idx
  on public.membership_applications(user_id)
  where user_id is not null;

create or replace function public.submit_membership_application(
  p_user_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_current_country text,
  p_return_status public.return_status,
  p_return_date date,
  p_district text,
  p_professional_background text,
  p_skills text,
  p_support_needs text
) returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  application_id uuid;
  resolved_user_id uuid := auth.uid();
  account_email text;
  account_confirmed_at timestamptz;
  account_created_at timestamptz;
begin
  if resolved_user_id is null then
    if p_user_id is null then
      raise exception 'A newly created member account is required';
    end if;

    select u.id, u.email, u.email_confirmed_at, u.created_at
      into resolved_user_id, account_email, account_confirmed_at, account_created_at
      from auth.users u
     where u.id = p_user_id
       and lower(u.email) = lower(trim(p_email));

    if resolved_user_id is null then
      raise exception 'Applicant identity does not match the account email';
    end if;

    if account_confirmed_at is not null or account_created_at < now() - interval '15 minutes' then
      raise exception 'Application must be submitted immediately after account creation or while signed in';
    end if;
  else
    select u.email into account_email from auth.users u where u.id = resolved_user_id;
    if account_email is null or lower(account_email) <> lower(trim(p_email)) then
      raise exception 'Applicant identity does not match the signed-in account';
    end if;
    if p_user_id is not null and p_user_id <> resolved_user_id then
      raise exception 'Applicant identity mismatch';
    end if;
  end if;

  if exists (select 1 from public.membership_applications a where a.user_id = resolved_user_id) then
    raise exception 'A membership application already exists for this account';
  end if;

  insert into public.membership_applications (
    user_id, full_name, email, phone, current_country, return_status, return_date,
    district, professional_background, skills, support_needs, consent, consented_at, status
  ) values (
    resolved_user_id, trim(p_full_name), lower(trim(p_email)), trim(p_phone), trim(p_current_country), p_return_status, p_return_date,
    nullif(trim(p_district), ''), nullif(trim(p_professional_background), ''), nullif(trim(p_skills), ''), trim(p_support_needs),
    'yes', now(), 'pending'
  ) returning id into application_id;

  update public.profiles
     set full_name = trim(p_full_name),
         phone = trim(p_phone),
         current_country = trim(p_current_country),
         return_status = p_return_status,
         return_date = p_return_date,
         district = nullif(trim(p_district), ''),
         professional_background = nullif(trim(p_professional_background), ''),
         skills = nullif(trim(p_skills), ''),
         support_needs = trim(p_support_needs),
         updated_at = now()
   where id = resolved_user_id;

  return application_id;
end;
$$;

revoke all on function public.submit_membership_application(uuid,text,text,text,text,public.return_status,date,text,text,text,text) from public;
grant execute on function public.submit_membership_application(uuid,text,text,text,text,public.return_status,date,text,text,text,text) to anon, authenticated, service_role;

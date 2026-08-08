create table if not exists private.admin_bootstrap_emails (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint admin_bootstrap_email_lowercase check (email = lower(email))
);

revoke all on table private.admin_bootstrap_emails from public, anon, authenticated;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  bootstrap_admin boolean := false;
begin
  select exists (
    select 1
    from private.admin_bootstrap_emails b
    where b.email = lower(coalesce(new.email, ''))
  ) into bootstrap_admin;

  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(coalesce(new.email, 'member'), '@', 1)),
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    case when bootstrap_admin then 'admin'::public.user_role else 'member'::public.user_role end
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    role = case when bootstrap_admin then 'admin'::public.user_role else public.profiles.role end,
    updated_at = now();

  update public.membership_applications
     set user_id = new.id
   where user_id is null
     and lower(email) = lower(coalesce(new.email, ''));

  if bootstrap_admin then
    delete from private.admin_bootstrap_emails
    where email = lower(coalesce(new.email, ''));
  end if;

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

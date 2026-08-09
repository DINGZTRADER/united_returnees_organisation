alter table public.profiles
  add column if not exists member_number text,
  add column if not exists profile_photo_path text,
  add column if not exists profile_photo_updated_at timestamptz;

create unique index if not exists profiles_member_number_unique
  on public.profiles(member_number)
  where member_number is not null;

create sequence if not exists public.uro_member_number_seq start with 1 increment by 1;

create or replace function private.ensure_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if tg_op = 'UPDATE' then
    if current_user not in ('postgres','service_role','supabase_admin') and not private.is_staff() then
      if new.role is distinct from old.role
         or new.membership_status is distinct from old.membership_status
         or new.membership_expires_at is distinct from old.membership_expires_at
         or new.member_number is distinct from old.member_number then
        raise exception 'Protected profile fields cannot be changed by members';
      end if;
    end if;
  end if;

  if new.membership_status = 'active'::public.membership_status
     and nullif(trim(coalesce(new.profile_photo_path,'')), '') is null then
    raise exception 'A profile photo is required before membership can be activated';
  end if;

  if new.membership_status = 'active'::public.membership_status and new.member_number is null then
    new.member_number := 'URO-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.uro_member_number_seq')::text,6,'0');
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_sensitive_fields_guard on public.profiles;
create trigger profiles_sensitive_fields_guard
before update on public.profiles
for each row execute function private.ensure_profile_sensitive_fields();

create or replace function public.verify_membership(p_member_number text)
returns table(member_number text, status text, valid_until date)
language sql
stable
security definer
set search_path = public
as $$
  select p.member_number,
         case
           when p.membership_status = 'active'::public.membership_status
             and p.membership_expires_at is not null
             and p.membership_expires_at >= now() then 'active'
           when p.membership_status = 'active'::public.membership_status then 'expired'
           else p.membership_status::text
         end as status,
         p.membership_expires_at::date as valid_until
  from public.profiles p
  where upper(p.member_number) = upper(trim(p_member_number))
  limit 1;
$$;

revoke all on function public.verify_membership(text) from public;
grant execute on function public.verify_membership(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-photos','member-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists member_photos_select_own_or_staff on storage.objects;
drop policy if exists member_photos_insert_own on storage.objects;
drop policy if exists member_photos_update_own on storage.objects;
drop policy if exists member_photos_delete_own on storage.objects;

create policy member_photos_select_own_or_staff
on storage.objects for select to authenticated
using (bucket_id = 'member-photos' and (((storage.foldername(name))[1] = auth.uid()::text) or private.is_staff()));

create policy member_photos_insert_own
on storage.objects for insert to authenticated
with check (bucket_id = 'member-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy member_photos_update_own
on storage.objects for update to authenticated
using (bucket_id = 'member-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'member-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy member_photos_delete_own
on storage.objects for delete to authenticated
using (bucket_id = 'member-photos' and (storage.foldername(name))[1] = auth.uid()::text);

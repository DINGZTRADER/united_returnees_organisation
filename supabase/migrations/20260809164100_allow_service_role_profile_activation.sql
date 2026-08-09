create or replace function private.ensure_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if tg_op = 'UPDATE' then
    if coalesce(auth.role(),'') <> 'service_role'
       and current_user not in ('postgres','service_role','supabase_admin')
       and not private.is_staff() then
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

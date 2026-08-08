create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_user_role() returns public.user_role language sql stable security definer set search_path=public as $$ select role from public.profiles where id=auth.uid(); $$;
create or replace function private.is_staff() returns boolean language sql stable security definer set search_path=public as $$ select coalesce(private.current_user_role() in ('staff'::public.user_role,'admin'::public.user_role),false); $$;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.is_staff() to authenticated;

create or replace function private.handle_new_auth_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,full_name,phone) values(new.id,lower(coalesce(new.email,'')),coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),split_part(coalesce(new.email,'member'),'@',1)),nullif(trim(new.raw_user_meta_data->>'phone'),''))
  on conflict(id) do update set email=excluded.email,full_name=coalesce(nullif(public.profiles.full_name,''),excluded.full_name),updated_at=now();
  update public.membership_applications set user_id=new.id where user_id is null and lower(email)=lower(coalesce(new.email,'')); return new;
end; $$;
revoke all on function private.handle_new_auth_user() from public,anon,authenticated;
drop trigger if exists on_auth_user_created on auth.users; create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_auth_user();

drop policy if exists "profiles_select_own_or_staff" on public.profiles; create policy "profiles_select_own_or_staff" on public.profiles for select to authenticated using(auth.uid()=id or private.is_staff());
drop policy if exists "applications_select_own_or_staff" on public.membership_applications; create policy "applications_select_own_or_staff" on public.membership_applications for select to authenticated using(user_id=auth.uid() or private.is_staff());
drop policy if exists "support_select_own_or_staff" on public.support_requests; create policy "support_select_own_or_staff" on public.support_requests for select to authenticated using(member_id=auth.uid() or private.is_staff());
drop policy if exists "support_update_staff" on public.support_requests; create policy "support_update_staff" on public.support_requests for update to authenticated using(private.is_staff()) with check(private.is_staff());
drop policy if exists "opportunities_public_read" on public.opportunities; create policy "opportunities_public_read" on public.opportunities for select to anon,authenticated using(published=true or private.is_staff());
drop policy if exists "opportunities_staff_insert" on public.opportunities; create policy "opportunities_staff_insert" on public.opportunities for insert to authenticated with check(private.is_staff());
drop policy if exists "opportunities_staff_update" on public.opportunities; create policy "opportunities_staff_update" on public.opportunities for update to authenticated using(private.is_staff()) with check(private.is_staff());
drop policy if exists "opportunities_staff_delete" on public.opportunities; create policy "opportunities_staff_delete" on public.opportunities for delete to authenticated using(private.is_staff());
drop policy if exists "memberships_select_own_or_staff" on public.memberships; create policy "memberships_select_own_or_staff" on public.memberships for select to authenticated using(user_id=auth.uid() or private.is_staff());

create or replace function public.review_membership_application(p_application_id uuid,p_status public.membership_status,p_note text default null) returns void language plpgsql security definer set search_path=public,private as $$
declare applicant_user_id uuid;
begin
  if not private.is_staff() then raise exception 'Not authorised'; end if;
  if p_status not in ('pending'::public.membership_status,'active'::public.membership_status,'rejected'::public.membership_status,'suspended'::public.membership_status) then raise exception 'Unsupported review status'; end if;
  update public.membership_applications set status=p_status,review_note=nullif(trim(p_note),''),reviewed_at=now(),reviewed_by=auth.uid() where id=p_application_id returning user_id into applicant_user_id;
  if not found then raise exception 'Application not found'; end if;
  if applicant_user_id is not null then update public.profiles set membership_status=p_status,updated_at=now() where id=applicant_user_id; end if;
end; $$;

revoke execute on function public.review_membership_application(uuid,public.membership_status,text) from public,anon; grant execute on function public.review_membership_application(uuid,public.membership_status,text) to authenticated;
revoke execute on function public.submit_membership_application(uuid,text,text,text,text,public.return_status,date,text,text,text,text) from public; grant execute on function public.submit_membership_application(uuid,text,text,text,text,public.return_status,date,text,text,text,text) to anon,authenticated;
revoke execute on function public.handle_new_auth_user() from public,anon,authenticated; revoke execute on function public.current_user_role() from public,anon,authenticated; revoke execute on function public.is_staff() from public,anon,authenticated;
drop function if exists public.handle_new_auth_user(); drop function if exists public.is_staff(); drop function if exists public.current_user_role();

create index if not exists membership_applications_reviewed_by_idx on public.membership_applications(reviewed_by);
create index if not exists support_requests_assigned_to_idx on public.support_requests(assigned_to);

drop policy if exists "profiles_select_own_or_staff" on public.profiles; create policy "profiles_select_own_or_staff" on public.profiles for select to authenticated using((select auth.uid())=id or private.is_staff());
drop policy if exists "profiles_update_own" on public.profiles; create policy "profiles_update_own" on public.profiles for update to authenticated using((select auth.uid())=id) with check((select auth.uid())=id);
drop policy if exists "applications_select_own_or_staff" on public.membership_applications; create policy "applications_select_own_or_staff" on public.membership_applications for select to authenticated using(user_id=(select auth.uid()) or private.is_staff());
drop policy if exists "support_select_own_or_staff" on public.support_requests; create policy "support_select_own_or_staff" on public.support_requests for select to authenticated using(member_id=(select auth.uid()) or private.is_staff());
drop policy if exists "support_insert_own" on public.support_requests; create policy "support_insert_own" on public.support_requests for insert to authenticated with check(member_id=(select auth.uid()));
drop policy if exists "memberships_select_own_or_staff" on public.memberships; create policy "memberships_select_own_or_staff" on public.memberships for select to authenticated using(user_id=(select auth.uid()) or private.is_staff());

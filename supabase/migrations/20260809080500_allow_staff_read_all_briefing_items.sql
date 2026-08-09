drop policy if exists briefing_items_staff_read_all on public.briefing_items;

create policy briefing_items_staff_read_all
on public.briefing_items
for select
to authenticated
using (private.is_staff());

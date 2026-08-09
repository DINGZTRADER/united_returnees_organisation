create table if not exists public.concierge_questions (
  id uuid primary key default gen_random_uuid(),
  question_redacted text not null check (char_length(question_redacted) between 2 and 500),
  page_path text not null default '/' check (char_length(page_path) between 1 and 160),
  grounded boolean not null default false,
  confidence text not null default 'low' check (confidence in ('low','medium','high')),
  category text,
  matched_article_id uuid references public.knowledge_articles(id) on delete set null,
  review_status text not null default 'open' check (review_status in ('open','reviewed','dismissed')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists concierge_questions_created_at_idx on public.concierge_questions (created_at desc);
create index if not exists concierge_questions_grounded_status_idx on public.concierge_questions (grounded, review_status, created_at desc);
create index if not exists concierge_questions_category_idx on public.concierge_questions (category, created_at desc);

alter table public.concierge_questions enable row level security;

revoke all on table public.concierge_questions from anon, authenticated;
grant insert on table public.concierge_questions to anon, authenticated;
grant select, update, delete on table public.concierge_questions to authenticated;

create policy "anonymous concierge events can be recorded"
on public.concierge_questions
for insert
to anon, authenticated
with check (
  char_length(question_redacted) between 2 and 500
  and page_path like '/%'
  and char_length(page_path) <= 160
  and confidence in ('low','medium','high')
  and review_status = 'open'
  and reviewed_at is null
);

create policy "staff can read concierge analytics"
on public.concierge_questions
for select
to authenticated
using ((select private.is_staff()));

create policy "staff can update concierge review queue"
on public.concierge_questions
for update
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy "staff can delete concierge analytics"
on public.concierge_questions
for delete
to authenticated
using ((select private.is_staff()));

create or replace function private.prune_old_concierge_questions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.concierge_questions
  where created_at < now() - interval '180 days';
  return new;
end;
$$;

revoke all on function private.prune_old_concierge_questions() from public;

create trigger prune_old_concierge_questions_after_insert
after insert on public.concierge_questions
for each statement execute function private.prune_old_concierge_questions();

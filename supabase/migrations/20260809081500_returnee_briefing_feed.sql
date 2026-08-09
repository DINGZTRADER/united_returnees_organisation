create table if not exists public.briefing_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('news','opportunity')),
  category text not null,
  title text not null,
  summary text not null,
  source_name text not null,
  source_url text not null,
  cta_label text not null default 'Read at source',
  published_at timestamptz,
  verified_at timestamptz not null default now(),
  expires_at timestamptz,
  priority integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists briefing_items_public_idx
  on public.briefing_items (published, priority desc, published_at desc nulls last, created_at desc);

alter table public.briefing_items enable row level security;

drop policy if exists briefing_items_public_read on public.briefing_items;
create policy briefing_items_public_read
  on public.briefing_items
  for select
  to anon, authenticated
  using (published = true and (expires_at is null or expires_at > now()));

drop policy if exists briefing_items_staff_insert on public.briefing_items;
create policy briefing_items_staff_insert
  on public.briefing_items
  for insert
  to authenticated
  with check (private.is_staff());

drop policy if exists briefing_items_staff_update on public.briefing_items;
create policy briefing_items_staff_update
  on public.briefing_items
  for update
  to authenticated
  using (private.is_staff())
  with check (private.is_staff());

drop policy if exists briefing_items_staff_delete on public.briefing_items;
create policy briefing_items_staff_delete
  on public.briefing_items
  for delete
  to authenticated
  using (private.is_staff());

grant select on public.briefing_items to anon, authenticated;
grant insert, update, delete on public.briefing_items to authenticated;

insert into public.briefing_items
(kind, category, title, summary, source_name, source_url, cta_label, published_at, verified_at, priority, published)
values
('news','Uganda economy','FY2026/27 budget puts commercial agriculture, industrialisation, services, digital transformation and market access at the centre','For returnees considering work, enterprise or investment, these priorities are a useful signal of where public policy and spending attention are concentrated this financial year.','Ministry of Finance, Planning and Economic Development','https://www.finance.go.ug/media-center/news-and-updates/launch-national-budget-month-fy-202627','Read the budget update','2026-06-02T00:00:00Z',now(),100,true),
('news','Investment','UIA says the FY2026/27 budget is opening new private-sector investment opportunities','Uganda Investment Authority is highlighting opportunities linked to the new budget and encouraging investors to explore priority sectors and formal investor-support channels.','Uganda Investment Authority','https://ugandainvest.go.ug/fy2026-27-budget-opens-new-investment-opportunities-as-uia-reaffirms-support-for-investors/','Read UIA update','2026-06-19T00:00:00Z',now(),95,true),
('opportunity','Diaspora investment','Diaspora investors can use UIA’s Investor One-Stop Centre when setting up in Uganda','UIA says Ugandans abroad can access investor facilitation, business setup guidance and investment information through its one-stop support system.','Uganda Investment Authority','https://ugandainvest.go.ug/first-uganda-diaspora-convention-held-in-lilongwe-malawi/','Explore diaspora investor support','2026-05-26T00:00:00Z',now(),92,true),
('opportunity','Women in business','GROW work-placement and apprenticeship applications are available for eligible women enterprises','The Government of Uganda GROW Project has an application route for work placement and apprenticeship support designed to strengthen practical business skills. Eligibility conditions apply.','GROW Project','https://grow.go.ug/informationcenter/applications/workplacement/','View application','2026-08-09T00:00:00Z',now(),90,true),
('opportunity','Skills','GROW is accepting applications for essential entrepreneurship skills training','Eligible women entrepreneurs and employees can apply for training covering areas including financial literacy, ICT, business growth and customer communication.','GROW Project','https://grow.go.ug/informationcenter/applications/essentialskills/','View training application','2026-08-09T00:00:00Z',now(),88,true),
('opportunity','SME finance','Uganda Development Bank offers SME Kazi financing with business advisory support','Returnees running qualifying Ugandan SMEs can review UDB’s SME Kazi facility and current eligibility requirements before applying.','Uganda Development Bank','https://www.udbl.co.ug/service/sme-kazi-loans/','Check current criteria','2026-08-09T00:00:00Z',now(),84,true),
('opportunity','Investment sectors','UIA maintains a current portfolio of priority sectors and bankable projects','The investment opportunities portal covers areas including agro-industrialisation, tourism, mineral value addition, ICT, energy, pharmaceuticals, infrastructure and other priority sectors.','Uganda Investment Authority','https://ugandainvest.go.ug/opportunities/','Browse investment opportunities','2026-02-01T00:00:00Z',now(),80,true)
on conflict do nothing;

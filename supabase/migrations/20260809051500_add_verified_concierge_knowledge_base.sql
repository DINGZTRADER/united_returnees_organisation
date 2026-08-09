create table if not exists public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null,
  question text not null,
  answer text not null,
  keywords text[] not null default '{}',
  source_name text not null,
  source_url text not null,
  source_kind text not null default 'official' check (source_kind in ('uro','official')),
  route_links jsonb not null default '[]'::jsonb check (jsonb_typeof(route_links) = 'array'),
  priority integer not null default 0,
  published boolean not null default false,
  verified_at timestamptz not null default now(),
  review_after date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_articles enable row level security;

drop policy if exists "Public can read published knowledge" on public.knowledge_articles;
create policy "Public can read published knowledge"
  on public.knowledge_articles for select
  to anon, authenticated
  using (published = true);

drop policy if exists "Staff can manage knowledge" on public.knowledge_articles;
create policy "Staff can manage knowledge"
  on public.knowledge_articles for all
  to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

create index if not exists knowledge_articles_published_priority_idx
  on public.knowledge_articles(published, priority desc, verified_at desc);
create index if not exists knowledge_articles_keywords_idx
  on public.knowledge_articles using gin(keywords);

insert into public.knowledge_articles
  (slug, category, question, answer, keywords, source_name, source_url, source_kind, route_links, priority, published, verified_at, review_after)
values
  ('uro-purpose','About URO','What is URO and who does it support?','United Returnees Organisation supports Ugandans abroad who are planning to return and Ugandans who have already returned home. URO focuses on practical pathways around employment, business and entrepreneurship, investment, settlement and relocation, verified government-service information, and community support.',array['uro','united returnees organisation','returnee','diaspora','return to uganda','support'],'United Returnees Organisation','/about','uro','[{"label":"About URO","href":"/about"},{"label":"Returnee support","href":"/services"}]'::jsonb,100,true,now(),current_date + 90),
  ('uro-membership','Membership','How do I join URO and who can become a member?','URO membership is open to Ugandans abroad planning to return and Ugandans who have already returned. The website currently displays an annual membership fee of USD 100. You can submit the membership application online; payment activation is being held until URO confirms its preferred payment arrangements.',array['join','membership','member','fee','100','usd 100','apply'],'United Returnees Organisation','/join','uro','[{"label":"Join URO","href":"/join"},{"label":"Member login","href":"/login"}]'::jsonb,98,true,now(),current_date + 60),
  ('return-planning','Returning to Uganda','I am planning to return to Uganda. Where should I start?','Start by clarifying your return objective, timing, finances, dependants and the practical decisions that must be made before committing money. URO recommends preparing deliberately, checking current Uganda requirements at official sources, and using its settlement, employment, business and investment pathways according to your situation.',array['return','returning','relocate','move home','coming home','settlement','planning','diaspora'],'United Returnees Organisation','/resources','uro','[{"label":"Settlement support","href":"/services#settlement-relocation"},{"label":"Returnee resources","href":"/resources"},{"label":"Get personal support","href":"/contact"}]'::jsonb,96,true,now(),current_date + 90),
  ('business-registration','Business','How do I register a business or company in Uganda?','Uganda Registration Services Bureau is the official body for registering companies, business names and other business entities in Uganda. A returnee starting a business should use URSB registration services and verify the current forms, fees and requirements directly with URSB before paying an intermediary.',array['business','company','register company','business registration','ursb','startup','entrepreneur'],'Uganda Registration Services Bureau','https://ursb.go.ug/services/business-registration/','official','[{"label":"URO business support","href":"/services#business-entrepreneurship"}]'::jsonb,94,true,now(),current_date + 45),
  ('taxpayer-tin','Tax & compliance','How do I get a Ugandan TIN?','Uganda Revenue Authority issues the Taxpayer Identification Number (TIN). URA states that individuals, companies and organisations likely to transact in tax-related business may need a TIN, and the TIN itself is issued free of charge. Use URA''s official TIN service to confirm the identification documents and process that apply to you.',array['tin','tax','taxpayer','ura','revenue','tax registration'],'Uganda Revenue Authority','https://ura.go.ug/en/domestic-taxes/tin-application/','official','[{"label":"Government & legal support","href":"/services#legal-government-services"}]'::jsonb,92,true,now(),current_date + 30),
  ('ordinary-passport','Documents','How do I apply for or renew a Ugandan passport?','The Directorate of Citizenship and Immigration Control handles Ugandan passport services. Ordinary passport applications are made through the official passport portal; applicants should check the current document requirements, fees and appointment process on the immigration website before applying.',array['passport','renew passport','travel document','immigration','dcic','documents'],'National Citizenship and Immigration Control','https://www.immigration.go.ug/passports/ordinary-passport','official','[{"label":"Government & legal support","href":"/services#legal-government-services"}]'::jsonb,90,true,now(),current_date + 30),
  ('citizenship-status','Citizenship','What if I have another citizenship or I used to be Ugandan?','Uganda''s immigration authority publishes separate official routes for dual citizenship, citizenship by registration or naturalisation, renunciation, and re-acquisition for a former Ugandan. The correct route depends on your citizenship history, so use the official citizenship pages and do not rely on informal advice for eligibility or fees.',array['dual citizenship','citizenship','former ugandan','reacquire','re-acquisition','foreign passport','immigration'],'National Citizenship and Immigration Control','https://immigration.go.ug/services/ugandan-citizenship','official','[{"label":"Government & legal support","href":"/services#legal-government-services"},{"label":"Contact URO","href":"/contact"}]'::jsonb,89,true,now(),current_date + 30),
  ('national-id','Documents','Where do I get information about a Ugandan National ID or NIN?','National Identification and Registration Authority manages Uganda''s National Identification Register, including citizen registration and National Identification Numbers. Use NIRA''s official website for current National ID registration, renewal, replacement and update guidance.',array['national id','nin','nira','identity','id card','registration'],'National Identification and Registration Authority','https://www.nira.go.ug/','official','[{"label":"Government & legal support","href":"/services#legal-government-services"}]'::jsonb,88,true,now(),current_date + 30),
  ('diaspora-investment','Investment','Where can a returnee get official investment support in Uganda?','Uganda Investment Authority is the Government investment-promotion agency and operates an Investor One-Stop Centre for business and investment facilitation. UIA also provides diaspora-focused investor support. Returnees considering investment should use official UIA channels to verify licensing, incentives and sector opportunities before committing capital.',array['investment','invest','diaspora investor','uia','one stop centre','investor','capital'],'Uganda Investment Authority','https://ugandainvest.go.ug/investor-facilitation/','official','[{"label":"URO investment support","href":"/services#investment"},{"label":"Current opportunities","href":"/#returnee-briefing"}]'::jsonb,91,true,now(),current_date + 30),
  ('land-title-check','Property & land','How should I verify land before buying property in Uganda?','For registered land, use the Ministry of Lands, Housing and Urban Development''s official land-registration and search procedures to check title information. Do not treat a copy of a title, a broker''s assurance or a private search as a substitute for official verification. For a specific transaction, obtain qualified legal advice before paying or signing.',array['land','property','title','land title','buy land','house','plot','verify land','mlhud'],'Ministry of Lands, Housing and Urban Development','https://mlhud.go.ug/ministry-procedures-for-land/','official','[{"label":"Settlement support","href":"/services#settlement-relocation"},{"label":"Government & legal support","href":"/services#legal-government-services"}]'::jsonb,90,true,now(),current_date + 30),
  ('current-opportunities','Opportunities','Where can I see current opportunities for returnees?','Use URO''s Returnee Briefing for curated Uganda updates and opportunities. Each item links back to its original public or official source so you can confirm eligibility, deadlines and current terms before acting.',array['opportunity','opportunities','jobs','grant','training','loan','finance','news','updates'],'United Returnees Organisation','/#returnee-briefing','uro','[{"label":"Open Returnee Briefing","href":"/#returnee-briefing"},{"label":"Returnee resources","href":"/resources"}]'::jsonb,95,true,now(),current_date + 30),
  ('personal-support','URO support','Can I speak to someone at URO for personal help?','Yes. If your situation needs personal guidance rather than general website information, use the URO contact page or WhatsApp support route. The concierge should not make a legal, tax, immigration, medical or investment decision for you.',array['contact','help','support','whatsapp','person','speak','human','advisor'],'United Returnees Organisation','/contact','uro','[{"label":"Get support","href":"/contact"},{"label":"WhatsApp URO","href":"https://wa.me/256750038345"}]'::jsonb,99,true,now(),current_date + 90)
on conflict (slug) do update set
  category = excluded.category,
  question = excluded.question,
  answer = excluded.answer,
  keywords = excluded.keywords,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  source_kind = excluded.source_kind,
  route_links = excluded.route_links,
  priority = excluded.priority,
  published = excluded.published,
  verified_at = excluded.verified_at,
  review_after = excluded.review_after,
  updated_at = now();

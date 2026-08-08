# United Returnees Organisation (URO)

Production-ready rebuild of the URO public website and membership platform prototype for deployment on Vercel.

## Product scope

- Public institutional website
- Annual URO membership (USD 100)
- Returnee membership application
- Member login and dashboard architecture
- Admin dashboard architecture
- Returnee support pathways
- Uganda Returnee Guide / Readiness Centre
- WhatsApp-first support handoff to +256 750 038 345
- Supabase-ready database schema with RLS
- Vercel-ready SEO and Open Graph metadata

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Production services

### Supabase
Create a Supabase project and run `supabase/schema.sql`, then set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Without Supabase credentials the public site remains usable and membership applications fall back to a direct WhatsApp handoff instead of silently losing data.

### Membership payments
Annual membership is presented as USD 100. Payment collection is intentionally not hard-coded until URO chooses its payment processor and provides production credentials. The current journey hands the applicant to URO on WhatsApp for payment instructions.

## Content verification notes

- Executive Director name is currently entered as **Denis Kalema** from URO-provided information. Public July 2026 reporting mentions a **Denis Kalemba** at returnee-government events; URO should confirm the official spelling before launch.
- Official URO email, domain and full Board/management directory are placeholders until registration details are supplied.
- Public recognition copy references the State House Diaspora Unit report: https://diasporaaffairs.go.ug/blog-single55.html

## Deployment

Connect this repository to Vercel and deploy the `main` branch. Add the environment variables above only after the live database is provisioned.

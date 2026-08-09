# United Returnees Organisation

Production-grade membership and returnee-support platform for United Returnees Organisation (URO), Uganda.

## Stack

- Next.js 15
- React 19
- Supabase (PostgreSQL, Auth, RLS)
- Vercel

## Core capabilities

- Public returnee-support website
- Membership registration and account authentication
- Member dashboard
- Staff/admin dashboard
- Membership application review
- Support requests and referrals
- Returnee news and opportunity briefing
- Verified Ask URO concierge knowledge base
- Privacy-safe concierge analytics and unanswered-question review queue
- Membership payment architecture (activation deferred pending URO confirmation)

## Development

```bash
npm install
npm run dev
```

Production builds run the photo-asset generation step before `next build`.

## Deployment

The `main` branch deploys to the URO Vercel production project.

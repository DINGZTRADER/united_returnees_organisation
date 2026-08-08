# Phase 2 — Supabase membership platform

Phase 2 activates real Supabase authentication and role-based access for URO.

## Implemented

- Email/password member accounts using Supabase Auth.
- Automatic profile creation from `auth.users`.
- Membership applications linked to member accounts.
- Member dashboard backed by live profile, support request and opportunity data.
- Support request creation with row-level security.
- Admin/staff dashboard with live metrics and application review.
- Approval/rejection RPC that updates membership status.
- RLS policies preventing members from reading other members' private data.
- Private helper schema for role checks.
- GitHub CI type-check and production-build validation.

## Roles

- `member`: own profile, own support requests, published opportunities.
- `staff`: operational read access and membership review.
- `admin`: same operational access; reserved for governance/admin functions added later.

## First administrator

Create a normal account through `/join`, then promote it once using SQL:

```sql
update public.profiles
set role = 'admin'
where lower(email) = lower('ADMIN_EMAIL_HERE');
```

Do not expose a public first-admin bootstrap route.

## Payment boundary

Membership is USD 100 annually. Phase 2 records membership state but does not collect payment. Payment gateway, receipts and automated renewals belong to Phase 3.

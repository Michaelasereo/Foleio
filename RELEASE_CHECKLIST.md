# Foleio Release Checklist

Run through this before every staging → main merge.

## Always (every release)
- [ ] Creator can sign up and complete onboarding
- [ ] Creator dashboard loads without errors
- [ ] Fan can visit a public creator profile
- [ ] Fan can subscribe and pay
- [ ] Booking flow works end to end
- [ ] Creator payout request works
- [ ] Admin dashboard loads
- [ ] Mobile experience looks correct
- [ ] No console errors on key pages

## Schema changes (db:push was run)
- [ ] db:push ran on staging database first
- [ ] db:push ran on production database
- [ ] Existing creator data intact
- [ ] Existing transactions intact

## Payment changes
- [ ] Paystack webhook receives test events
- [ ] Transaction recorded in database correctly
- [ ] Creator balance updates correctly
- [ ] Payout flow unaffected

## Auth changes
- [ ] Creator login works
- [ ] Fan passwordless login works
- [ ] Admin password gate works
- [ ] Sessions persist correctly

## Email changes
- [ ] Test email received from Resend
- [ ] Email formatting correct on mobile
- [ ] Links in emails work correctly

## After deploying to production
- [ ] Check Netlify deploy log — no build errors
- [ ] Check admin dashboard — transactions showing
- [ ] Check Supabase — no error spike
- [ ] Smoke test one full flow on live URL

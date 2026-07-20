# Foleio Release Checklist

Run through this before every staging → main merge.

## Always (every release)
- [ ] Creator can sign up and complete onboarding
- [ ] Creator dashboard loads without errors
- [ ] Fan can visit a public creator profile
- [ ] Fan can subscribe and pay (if product still live)
- [ ] **Booking E2E (subaccount):** bank save → ACTIVE subaccount → public Book → pay → booking confirmed → Earnings shows transaction / Settled to bank
- [ ] Public Book blocked when creator has no ACTIVE subaccount (“Payments not set up yet”)
- [ ] Admin dashboard loads (creators show payment readiness; transactions filterable by Subaccount split)
- [ ] Mobile experience looks correct
- [ ] No console errors on key pages
- [ ] Playwright: `pnpm --filter web test:e2e` (admin smoke + subaccount API smokes)

## Schema changes (db:push was run)
- [ ] db:push ran on staging database first
- [ ] db:push ran on production database
- [ ] Existing creator data intact
- [ ] Existing transactions intact

## Payment changes (Paystack subaccount)
- [ ] `PAYSTACK_PRO_MONTHLY_PLAN_CODE` and `PAYSTACK_PRO_QUARTERLY_PLAN_CODE` set in prod
- [ ] `FOLEIO_PLATFORM_FEE_PERCENT` fallback set in prod (default 3.5; app uses plan-based Free/Pro fees)
- [ ] Paystack business activated for live subaccount settlements
- [ ] Webhook URL: `https://your-domain.com/api/webhooks/paystack` (`charge.success`)
- [ ] Test charge creates `Transaction` with `paymentType: DIRECT_SUBACCOUNT`
- [ ] Creator share settles via Paystack (not Foleio withdraw)
- [ ] Legacy withdraw UI removed from Dashboard / Earnings

## Auth changes
- [ ] Creator login works
- [ ] Fan passwordless login works
- [ ] Admin password gate works
- [ ] Sessions persist correctly

## Email changes
- [ ] Test email received from Resend
- [ ] Booking confirmation email after successful pay
- [ ] Email formatting correct on mobile
- [ ] Links in emails work correctly

## After deploying to production
- [ ] Check Netlify deploy log — no build errors
- [ ] Check admin → Transactions (booking + Subaccount split)
- [ ] Check admin → Creators (Payments column)
- [ ] Check Supabase — no error spike
- [ ] Smoke test one full booking payment on live URL

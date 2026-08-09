# Foleio — Merchant product features (current)

**Audience:** Head of Product / product ideation  
**Scope:** What merchants (creators) can use **today** on Foleio  
**As of:** August 2026  
**Product URL:** https://foleio.com  

Use this as the baseline of “what we already own” before ideating new products. Items marked **Partial** exist in code or UI but are not a primary live merchant workflow.

---

## One-line product

Foleio is a Nigerian creator business OS: one public profile where merchants sell **bookable services** and **shop products**, collect Paystack payments in NGN, and manage operations (bookings, orders, earnings, payouts).

---

## Merchant jobs we already support

| Job | Status |
| --- | --- |
| Get a public storefront / booking page | Live |
| Sell services with calendar + deposits | Live |
| Sell products with delivery / pickup | Live |
| See earnings after fees | Live |
| Set up bank / KYC for payouts | Live |
| Manage account, plan, password | Live |
| Sell paid content / courses / fan subscriptions | **Partial / MVP-hidden** (not primary merchant surface today) |

---

## 1. Workspace & onboarding

- Dashboard with booking / earnings / products-sold snapshot and upcoming bookings
- Setup checklist (cover, bio, payments, bookings/shop, fees)
- Welcome flow + product tour
- Plan badge in nav (Starter / Growth / Pro)
- “View public page” + custom links from the sidebar

---

## 2. Public profile (storefront)

- Public page at `/creator/{username}`
- Display name, username, bio, industry, avatar, cover/banner
- Social links + custom links
- Portfolio gallery (plan-limited)
- Public **Services** and **Shop** tabs
- Public reviews (when enabled)
- Share / copy profile URL
- Bookings blocked until payout account is ready (and KYC when required)

---

## 3. Bookings & services

### Services
- Create/edit services (price list): name, price, duration, categories, add-ons
- Per-service **deposits** (% or fixed) or full pay
- Convert product ↔ service (where allowed)

### Availability
- Calendar: full-day or hourly slots
- Bulk date updates
- Schedule templates (**Pro**)

### Bookings ops
- Hub: Upcoming / Completed / Disputed
- Booking detail with deposit vs balance breakdown
- Refund approve/reject on disputes
- Deposits & cancellation policy (balance-due timing, refund rules)

### Customer side (merchant value)
- Public booking + Paystack (full or deposit)
- Balance pay later via tracking page
- Tracking link after payment

### Automation that helps merchants collect money
- Balance due reminders to customers
- Balance overdue alert to merchant
- Session reminder before appointments
- Abandoned checkout: **1h** customer reminder + **24h** auto-cancel of unpaid pending bookings (frees slots)

---

## 4. Shop & orders

### Products
- Create/edit/delete products, images, stock, publish, reorder
- Types: physical, digital (**plan-gated**), gift cards (**plan-gated**)
- Variants, add-ons, compare-at price, preorders (**plan limits**)
- Min order qty, prep-time estimates
- CSV import
- Coupons (**plan-gated**)

### Fulfillment
- Delivery tiers: flat-rate regions, free delivery, pickup, **customer-arranged** (with merchant contact phone)
- Checkout shows delivery choice + fee

### Orders
- Orders list with statuses (Confirmed → Processing → Delivered)
- Public shop on profile + cart/checkout + order success
- Resume unpaid checkout: `/shop/pay/{orderId}`
- Abandoned checkout: **1h** reminder + **24h** auto-cancel of unpaid pending orders

### Automation
- New paid order email to merchant
- Customer order confirmation (+ gift / digital flows where configured)

---

## 5. Earnings & analytics

- Earnings: total, full payments, deposits, outstanding balances (creator share after platform fees)
- Includes bookings **and** shop (with ledger + historical shop-order fallback)
- Recent transactions + CSV export
- Analytics under Earnings: bookings vs shop, trends, top services/products
- Available balance in nav

**Partial:** dedicated “request payout” / payout schedule as a first-class nav flow — bank setup + earnings are the live path; older payout request surfaces are secondary.

---

## 6. Payouts & trust

- Nigerian bank account setup via Paystack subaccount
- Optional Dojah KYC when platform requires it
- Payments readiness gate before live bookings/shop charges
- Payout confirmation emails (backend)

---

## 7. Settings (merchant account)

| Tab / area | What it does |
| --- | --- |
| Profile | Identity, socials, links |
| Portfolio | Gallery management |
| Reviews | Manage quotes; show/hide on public page (plan caps) |
| Billing | Free / Pro / Growth (where eligible); upgrade/cancel; fee copy; history |
| Deposits & policy | Booking payment + cancellation rules |
| Chat with us | Feedback / bugs / questions |
| Security | Change password |
| Developer support | Temporary setup access for Foleio team (no password share); revoke anytime |
| Notifications | **Partial** — tab placeholder (“coming soon”) |

Developer support mode **blocks** earnings, payouts, billing, and security for the support session.

---

## 8. Reviews

- Collect reviews after completed bookings / delivered orders
- Merchant manages quotes in Settings → Reviews
- Optional public display on profile

---

## 9. Plans & monetization (platform → merchant)

- Creator plans: Starter (free) / Pro / Growth (eligibility-gated)
- Platform takes a fee on booking and shop GMV (fee % depends on plan)
- Merchants pay optional Pro/Growth subscription for higher limits (products, services, templates, etc.)

---

## 10. Intentionally not primary (for ideation clarity)

These exist in the codebase or older roadmap but are **not** the current merchant MVP surface:

- Paid content / tutorials / collections / journal as day-to-day merchant tools (**MVP-hidden**)
- Fan subscriptions as a primary merchant growth loop (**partial / hidden**)
- Rich notification preferences (**not built**)
- Full self-serve payout request UX as the main earnings story (**partial**)

When ideating new products, treat these as **re-open decisions**, not as “already shipping.”

---

## Competitive framing (merchant lens)

| Need | Foleio today |
| --- | --- |
| Link-in-bio | Public profile + links |
| Booking tool | Services, calendar, deposits, tracking |
| Storefront | Shop, delivery, orders |
| Ops | Bookings/orders hubs, emails, abandoned checkout |
| Money out | Bank/KYC + earnings after fees |

**Gap / opportunity areas to ideate against:** deeper CRM, notifications, marketing automations, stronger content/course commerce, clearer payout UX, multi-staff / multi-location, inventory depth, WhatsApp-native ops.

---

## Suggested questions for HoP ideation

1. Which merchant segment are we doubling down on next 90 days (beauty/services vs product sellers vs hybrid)?
2. Do we reopen **content/courses**, or keep Foleio as **bookings + shop OS**?
3. Is the next wedge **acquisition** (discovery, SEO, templates) or **retention/ops** (CRM, WhatsApp, staff)?
4. What must be true for a merchant to recommend Foleio to a peer in one sentence?

---

## Related deeper docs (optional)

- `MARKETING_FEATURE_INVENTORY.md` — full capability catalog  
- `PROJECT_CONTEXT.md` — stack and architecture  
- `ODIM_INVESTOR_DECK.md` — market narrative (may lag product)

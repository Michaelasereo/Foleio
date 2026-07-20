# Creator go-live onboarding guide

Product-synced brief for first-time creators: shortest path from signup to taking **bookings** and/or **shop orders**.

**Audience:** new creator (second person — “you”).

**Goal:** cover, profile, payouts, then shop and/or bookings — then you’re live.

---

## Flow overview

```
Cover → Bio → Payments → Shop and/or Bookings → Live
```

Everyone does shared setup first. Then follow **Shop**, **Bookings**, or both (from onboarding use cases).

---

## Shared steps (everyone)

### 1. Update cover image
- **Where:** Dashboard (`/dashboard`) — business cover on the left column
- **Why:** First thing clients see on your public page
- **Done when:** A cover/banner is uploaded
- **Mobile note:** Cover + name/verified show on Dashboard on mobile; hidden on other tools until ≥900px

### 2. Update bio (Settings)
- **Where:** Settings → Profile (`/settings?tab=profile`)
- **Why:** Display name, bio, and basics so the page feels real
- **Done when:** Profile saved

### 3. Set up payment account (Earnings)
- **Where:** Earnings (`/earnings`) — bank / payout setup
- **Why:** Needed so paid bookings and shop sales can settle
- **Done when:** Nigerian bank account is linked and ready
- **Settlement (for copy):** After a successful payment, your creator share settles **directly to your linked Nigerian bank** through Paystack on Paystack’s normal cycle (typically the next business day). There is **no separate withdraw or payout-request step**.

---

## Path A — Shop (if you sell)

### 4a. Set up shop
- **Where:** Shop (`/shop`)
- **Page layout (current):**
  1. Heading **Shop** + subtitle
  2. Summary cards (total / active / draft / orders)
  3. Tabs: **Products** | **Orders** | **Delivery**
  4. Products tab: **Add products** (manual + CSV) as its own section, then **Product list** cards
- **Tasks:**
  - Add at least one product (photos, sale price; optional discount or preorder)
  - Review **Orders** as sales come in
  - Add **Delivery** options if you ship / offer pickup / free delivery (skip if you don’t need them)
- **Done when:** At least one **active** product is published; delivery set if physical fulfillment applies
- **Public:** Products show as horizontal cards (image, title, stock badge, description, price, **Shop** button) on your public profile shop

---

## Path B — Bookings (if you take sessions)

### 4b. Set up bookings
- **Where:** Bookings (`/bookings`)
- **Page layout (current):** Heading + tabs **Bookings** | **Services** | **Manage availability**
- **Tasks (in order):**
  1. **Manage availability** — when clients can book (`/bookings?tab=availability`)
  2. **Services** — what you offer and prices (`/bookings?tab=services`)
  3. **Bookings** — incoming / upcoming list
- **Done when:** Availability is set and at least one bookable service exists

---

## Fees (know before you charge)

- **Where:** Creator policy (`/dashboard/policy`) — Fee calculator beside Platform & service fees
- **Free and Pro:** 3.5% platform & service fees on every charge (same rate)
- **Pro difference:** features (unlimited services/products, portfolio categories, schedule templates) — not a lower fee
- Calculator shows the 3.5% split for an amount; upgrade goes to Billing (`/settings?tab=billing`)

Not a required onboarding step, but creators should open this once before going live.

---

## End state — You’re live

- Public page shows your cover + profile
- Bank linked for settlement
- Shop has active products and/or Bookings has availability + services
- Clients can pay; your share settles to your bank on Paystack’s cycle (no withdraw step)

---

## Deep links (for checklist UI)

| Step | Link |
|------|------|
| Cover | `/dashboard` |
| Bio | `/settings?tab=profile` |
| Payments | `/earnings` |
| Shop products | `/shop` |
| Shop orders | `/shop` (Orders tab) |
| Shop delivery | `/shop` (Delivery tab) |
| Bookings availability | `/bookings?tab=availability` |
| Bookings services | `/bookings?tab=services` |
| Fees / calculator | `/dashboard/policy` |
| Billing upgrade | `/settings?tab=billing` |

---

## Suggested UI (design / implement later)

- Checklist or setup tour on dashboard, progress 1 → N
- Mark complete by real actions (banner set, bio saved, bank linked, product active, availability + service) when possible
- Branch shop vs bookings from use cases chosen at `/onboard`
- Finale: “You’re live” + link to public profile URL

**Existing related UI:** floating setup tour in the creator shell; welcome modal / spotlight tour flags on creator — align or replace rather than duplicating.

---

## Copy tone

- Talk **to the creator**: “Add your cover”, “Link your bank”, “Set when you’re available”
- Prefer plain actions over internal jargon
- Settlement copy: settle to **your** linked bank — no withdraw request

---

## Acceptance checklist

- [ ] Cover → Dashboard
- [ ] Bio → Settings → Profile
- [ ] Payments → Earnings (settlement explanation correct)
- [ ] Shop → products (+ orders / delivery as needed)
- [ ] Bookings → availability → services
- [ ] Optional: policy fee calculator pointed out
- [ ] Clear “You’re live” end state
- [ ] Creator-facing voice throughout

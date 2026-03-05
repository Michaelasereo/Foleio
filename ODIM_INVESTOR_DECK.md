# Foleio — Investor Deck

**Creator monetization platform for Nigeria**

*Confidential — for investor review*

---

## 1. Cover

**Foleio**  
*Your work. Your world. Your Foleio.*

*Foleio* (Igbo: “Creator” / “Beautiful Creator”) is a full-stack platform for Nigerian creators to monetize through subscriptions, content and courses, and service bookings—with local payment (Paystack), NGN pricing, and payouts to Nigerian bank accounts.

**Tagline:** *Your work. Your world. Your Foleio.*

---

## 2. Problem

- **Creators lack a single monetization hub:** Many Nigerian creators use a mix of Instagram, WhatsApp, and informal payments—no unified place for subscriptions, paid content, and bookable services with proper payouts.
- **Payments and payouts friction:** Global platforms often don’t support NGN, local cards, or mobile money; payouts are slow or unavailable; creators lose revenue to high fees and chargebacks.
- **Content and courses are scattered:** Tutorials and courses live in unmonetized or hard-to-pay formats; no clear path from “fan” to “subscriber” or “one-time buyer” with Nigerian payment methods.
- **Services are manual:** Bookings happen via DMs and cash; no availability calendar, no payment upfront, no tracking or dispute handling—scaling is difficult and trust is low.

---

## 3. Solution

**Foleio** is a creator monetization platform built for Nigeria:

- **For creators:** One place to set up a public profile (Linktree-style), sell subscriptions, sell content/collections/tutorials, and offer bookable services with availability and payouts in NGN.
- **For fans and customers:** Discover creators, subscribe with local payment (Paystack), buy one-time content or courses, book services, and track orders—all in Naira.
- **For the platform:** Single modern stack (Next.js, Supabase, Paystack, Cloudflare), scalable, with built-in revenue (platform fees on subscriptions, content, and bookings; optional platform subscription tiers for creators).

---

## 4. Product — What We’ve Built

### 4.1 Core platform (live / deployment-ready)

| Area | Capability |
|------|-------------|
| **Creator onboarding** | 4-step wizard: business info (name, bio, category, social), bank details (Nigerian banks, Paystack recipient), subscription plan(s), platform plan (Starter/Pro/Premium); 30-day trial; progress saved |
| **Public profiles** | Linktree-style page per creator: banner, avatar, bio, @username, category, intro video; links (Instagram, YouTube, Twitter, TikTok, custom); no login required |
| **Content** | Upload video (Cloudflare Stream), image/PDF/text (R2); access: free, subscription, or one-time; categories (content/tutorial); thumbnails; publish/draft; view counts |
| **Collections & courses** | Sections with ordered content; access: free / subscription / one-time; optional price; link tutorials to collections |
| **Subscriptions** | Creator-defined plans (name, price ₦/month, description); Paystack recurring; 15% platform fee; one active subscription per fan per creator |
| **One-time content** | Tutorial/collection purchase via Paystack; 10% platform fee; email-based premium access codes (6-digit, 15 min expiry) for gated content |
| **Services & bookings** | Price list by category (name, price, duration); availability calendar (per-date, optional max bookings); customer books → selects date → pays (Paystack) → tracking page with status |
| **Booking payouts** | 60% to creator on payment confirmation; 40% after service completion; platform fee on transaction; dispute flow (refund request, creator approve/reject) |
| **Payouts** | Creator balance from subscriptions/content/bookings; request payout (min ₦1,000); Paystack transfer to Nigerian bank; payout history (pending/processing/success/failed) |
| **Dashboard & analytics** | Earnings, subscribers, content views, engagement; recent subscribers; top content; booking stats and revenue |
| **Admin** | Payment reconciliation (failed webhooks, retry, processed count, revenue); foundation for user/creator/order management |

### 4.2 User roles and flows

- **Creators:** Sign up → onboarding (4 steps) → dashboard → content/collections, bookings, availability, price list, payouts, settings; public profile at `/creator/[username]`.
- **Fans/customers:** Visit creator profile → subscribe (plan → Paystack) or buy content/collection (Paystack) or book service (service → date → details → Paystack) → tracking link for bookings; premium content via email code.
- **Admins:** Reconciliation dashboard (webhook health, retries, revenue stats); extensible for full platform ops.

### 4.3 Technical foundation

- **Stack:** Next.js 16 (App Router, TypeScript), single app (frontend + API); Prisma + **Supabase (PostgreSQL)**; **Paystack** (one-time and recurring, transfers); **Cloudflare R2** (files); **Cloudflare Stream** (video); **Netlify** (hosting); Turborepo monorepo.
- **Quality:** Structured env and deployment (Supabase, Paystack, Cloudflare, Netlify); Paystack webhooks for payment and subscription lifecycle; dead-letter queue and admin reconciliation for failed webhooks.
- **Revenue logic:** Platform fees on subscriptions (15%), collections/tutorials (10%), and bookings (5%); 60/40 booking split (creator/service completion); optional platform subscription (Starter free, Pro ₦5,000/mo, Premium ₦15,000/mo).

---

## 5. Market Opportunity

- **Nigerian creator economy:** Growing base of creators in makeup, fashion, fitness, food, lifestyle; demand for subscriptions, courses, and bookable services with local payment and payouts.
- **Primary focus:** Nigeria (NGN, Paystack, Nigerian banks); product and copy designed for Nigerian creators and fans.
- **Segments:** Individual creators and small studios who want one platform for subscriptions, content/courses, and services—without juggling multiple tools or informal payment flows.

---

## 6. Business Model

- **Current:** Platform earns via fees on creator revenue: ~15% on subscriptions, 10% on one-time content/collections, ~5% on bookings; 60/40 booking split protects service completion before full creator payout.
- **Monetization levers:** Platform subscription tiers (Pro, Premium) for advanced features or lower fees; optional promoted placement; B2B (studios, agencies); potential expansion to other African markets with local payment partners.
- **Transparency:** Creators see fee structure; payouts in NGN to Nigerian bank accounts; minimum payout ₦1,000.

---

## 7. Traction & Milestones

- **Product:** Full creator and fan flows built and wired: onboarding, profiles, content, collections, subscriptions, one-time purchases, bookings, availability, payouts, dashboard, premium access, admin reconciliation.
- **Deployment:** Production-ready (Next.js, env docs, Netlify); Paystack webhooks and reconciliation in place.
- **Next steps:** Onboard first creators; validate pricing and fee structure; add platform subscription gating and premium features; scale acquisition and retention.

---

## 8. Competition

- **Global creator platforms:** Often lack deep NGN/local payment, Nigerian bank payouts, and combined subscriptions + content + bookings in one product.
- **Informal / fragmented:** WhatsApp, manual lists, cash—no recurring subscriptions, no content paywall, no booking calendar or dispute handling.
- **Foleio’s edge:** Built for Nigeria (Paystack, NGN, local UX); single platform for subscriptions, content/courses, and services; transparent fees and 60/40 booking split; scalable stack and clear path to platform subscription revenue.

---

## 9. Team

*[Add brief team bios, roles, and relevant experience.]*

---

## 10. The Ask

*[Specify raise amount, round (e.g. pre-seed/seed), and main use of funds—e.g. growth, marketing, key hires, scaling infrastructure.]*

---

## 11. Contact

**Foleio**  
*[Add contact email, website, and optional calendar link.]*

---

*Document generated from the Foleio codebase and product. Last updated: February 2025.*

# Foleio Platform — Resume Bullets by Role

Use the section that matches the role you’re applying for. Copy bullets as-is or shorten for space. **Foleio** = Nigerian creator monetization platform (subscriptions, content, bookings, payouts).

---

## Product Designer

- **Designed end-to-end creator onboarding** — 4-step wizard (business info, bank details, subscription plans, platform plan) with clear progress and validation; reduced drop-off with inline errors and optional steps.
- **Designed creator dashboard and analytics** — Metrics for subscribers, revenue, content performance, and recent transactions; balanced information hierarchy for quick scanning and action.
- **Designed content and collection management** — Upload flows for video/image/PDF/text; course/playlist structure with sections; access controls (free, subscription, one-time) surfaced in simple controls.
- **Designed booking and services experience** — Service catalog with categories and durations; availability calendar; customer booking flow (contact, date, payment); post-booking tracking page for customers.
- **Designed public creator profiles** — Linktree-style pages with bio, social links, intro video, and CTAs for subscribe/book; consistent layout for discovery and conversion.
- **Designed payment and subscription flows** — Plan selection, Paystack checkout integration, subscription modal, and premium access via email verification codes; clear success and error states.
- **Designed creator settings and payouts** — Profile/settings forms, payout request and history, service/price-list and availability management; unified navigation via sidebar.
- **Established design system usage** — Component-based UI (Shadcn/ui, Tailwind); consistent forms, modals, toasts, and responsive patterns across auth, dashboard, and public pages.

---

## Front-End Developer

- **Built Foleio web app** in **Next.js 16 (App Router)** and **TypeScript**; implemented auth-gated creator routes, public creator profiles, and fan-facing discovery and checkout flows.
- **Implemented creator dashboard** — Server and client components for analytics (Recharts), subscriber metrics, revenue summary, and recent activity; integrated with analytics API and server actions.
- **Built content and collection UIs** — Content list, create/edit forms, drag-drop upload with progress; collections with sections, ordering, and pricing; access-type and plan selection.
- **Implemented booking and services flows** — `BookingModal`, `PriceListManager`, `AvailabilityManager`, calendar-based availability; customer booking form and token-based tracking page (`/tracking/[token]`).
- **Integrated Paystack** on the client for subscriptions and one-time payments; built `SubscriptionModal`, `TutorialPurchaseModal`, `CollectionSubscriptionModal`, and payment callback handling.
- **Built premium access flow** — `PremiumAccessModal`, send-code and verify-code API calls, cookie-based session access and expiry handling.
- **Implemented upload UX** — Cloudflare Stream (video) and R2 (files) integration; upload progress, status polling, and error handling in content creation flow.
- **Built responsive creator experience** — `CreatorSidebar` navigation (Dashboard, Content, Bookings, Availability, Services, Payouts, Settings); layout adapts for mobile and desktop.
- **Used design system and patterns** — Shadcn/ui, Tailwind CSS, React Hook Form + Zod validation, toast notifications, loading and error states across 65+ components.

---

## Backend Developer

- **Designed and maintained Prisma schema** — 25+ models (User, Creator, Content, Collection, Section, Booking, Transaction, Payout, FanSubscription, etc.); enums for tiers, payout methods, upload status; indexes for queries and uniqueness.
- **Implemented REST APIs** in Next.js Route Handlers — 30+ endpoints for auth-scoped creator actions, public discovery, payments, and webhooks; consistent error handling and JSON responses.
- **Built payment and subscription backend** — Paystack initialize/verify flows; webhook handler for payment events; transaction and `FanSubscription` lifecycle; support for subaccount splits and recurring billing.
- **Built booking system** — Create booking (validation, availability check, 60/40 payout split); verify-payment, complete, refund-request; token-based tracking (GET/POST); status workflow (pending → paid → completed/disputed).
- **Implemented content and collection APIs** — CRUD for content (with Mux/Stream IDs) and collections; section and section-content management; access rules and plan validation.
- **Built upload pipeline** — Stream (video) and R2 (files) upload routes; upload status polling; link to `Content` and `Upload` records; auth and server-side validation.
- **Implemented premium access** — Send 6-digit code (Resend), store in `PremiumAccessCode` with 15-min expiry; verify-code with cookie-based access and idempotency considerations.
- **Built creator and discovery APIs** — `/api/creator/me`, profile update; `/api/creators` and `/api/creators/[username]` for public discovery with plans and content metadata.
- **Integrated external services** — Supabase (auth, DB), Paystack (payments, transfers, webhooks), Cloudflare Stream & R2, Resend (email); env-based config and server-side keys.

---

## Product Manager

- **Shipped Foleio** — Nigerian creator platform from concept to production: creator onboarding, content & courses, subscriptions, bookings, payouts, and public profiles.
- **Defined and documented product scope** — PRD with user stories (Creator, Fan, Customer), acceptance criteria, and evidence in code; kept PRD aligned with implementation (auth, content, payments, bookings, premium access, analytics).
- **Owned creator lifecycle** — Onboarding (4 steps, bank details, plans, platform plan + trial); dashboard (metrics, payouts, settings); content, collections, services, and availability management.
- **Owned monetization model** — Subscription plans and Paystack recurring; one-time tutorial/collection purchase; 60/40 booking payout; platform fee rules; payout methods (scheduled bulk, instant, subaccount).
- **Defined booking product** — Service catalog, availability, customer booking (no account), payment, tracking page, status workflow, and dispute/refund flows; aligned eng on APIs and UX.
- **Drove access and growth features** — Premium access via email codes; email subscriptions for creator updates; public creator profiles and Linktree-style links for discovery and conversion.
- **Prioritized technical and UX quality** — Documented edge cases, risks, and gaps (rate limiting, idempotency, webhooks); aligned with eng on payment atomicity and error handling.
- **Stakeholder alignment** — Clear flows for creators (earn), fans (subscribe/access), and customers (book); requirements traceable from PRD to APIs and UI for design, front-end, and backend.

---

## Quick project line (any resume)

**Foleio** — Nigerian creator platform (Next.js, TypeScript, Supabase, Paystack): creator onboarding, content & courses, subscriptions, service bookings, payouts, and public profiles.

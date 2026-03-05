# Foleio Platform — Project Context Document

**Purpose:** Master reference for all future development. No code changes were made; this document is generated from codebase analysis.

---

## 1. Project Overview

### What the app does

**Foleio** (Igbo: "Creator" / "Beautiful Creator") is a **Nigerian creator monetization platform**. It lets creators:

- **Monetize via subscriptions** — Fans subscribe to creator plans with recurring Paystack payments (NGN).
- **Sell content and courses** — Upload video/image/PDF/text; organize into collections (courses) with sections; set access (free, subscription, one-time); sell individual tutorials or collection access.
- **Offer bookable services** — Price list with categories, availability calendar, and bookings with Paystack checkout; 60% payout to creator on payment, 40% after service completion.
- **Get paid in Naira** — Payouts to Nigerian bank accounts via Paystack (min ₦1,000); balance from subscriptions, content sales, and bookings.

Fans and customers can discover creators on public profiles (Linktree-style), subscribe, buy content/collections, book services, and track bookings via email and a tracking token—without needing an account for purchases.

### Target users

- **Creators** — Nigerian content creators (makeup, fashion, fitness, food, lifestyle, etc.) who want one platform for subscriptions, content/courses, and service bookings with local payment and payouts.
- **Fans / customers** — Viewers who subscribe, buy one-time content, or book services; some flows require only email/phone (no login).
- **Admins** — Platform operators (reconciliation dashboard for Paystack webhooks, retries, revenue stats).

---

## 2. Tech Stack

### Root / monorepo

| Technology      | Version / note |
|-----------------|----------------|
| Package manager | pnpm 9.0.0     |
| Node            | ≥20.0.0        |
| Turborepo      | ^2.3.3         |
| TypeScript      | ^5.7.2         |
| Biome           | ^1.9.4 (lint/format) |

### apps/web (Next.js app)

| Category     | Technology              | Version / note        |
|-------------|-------------------------|------------------------|
| Framework   | Next.js                 | ^16.1.0 (App Router)   |
| React       | react, react-dom        | ^19.0.0                |
| Language    | TypeScript              | 5.9.3 (app), 5.7.2 (root) |
| Styling     | Tailwind CSS            | ^3.4.19                |
| UI          | Radix UI (multiple)     | Various ^1.x, ^2.x     |
| Animations  | tailwindcss-animate     | ^1.0.7                 |
| Forms       | react-hook-form        | ^7.54.2                |
| Validation  | zod                     | ^3.24.1, @hookform/resolvers ^3.9.1 |
| Icons       | lucide-react            | ^0.469.0               |
| Charts      | recharts                | ^2.15.0                |
| Themes      | next-themes             | ^0.4.4                 |
| Utilities   | clsx, tailwind-merge, class-variance-authority | ^2.1.1, ^2.6.0, ^0.7.1 |
| Database    | Prisma + Supabase (PostgreSQL) | Via @foleio/database |
| Auth        | @supabase/ssr, @supabase/supabase-js | ^0.5.2, ^2.47.10 |
| Payments    | Paystack (NGN)          | Via lib/paystack.ts    |
| Video       | Mux (upload/playback)   | Via lib/mux.ts; also Cloudflare Stream in lib/cloudflare/stream.ts |
| Storage     | Cloudflare R2, Supabase storage | lib/cloudflare/r2.ts, lib/storage/* |
| Queues      | BullMQ, ioredis         | ^5.12.14, ^5.4.1       |
| Monitoring  | @sentry/nextjs         | ^8.40.0                |
| AWS SDK     | @aws-sdk/client-s3     | ^3.700.0 (optional)   |
| Testing     | Vitest, Playwright, @testing-library/react | ^2.1.8, ^1.48.0, ^16.1.0 |
| Build       | PostCSS, autoprefixer  | ^8.5.6, ^10.4.23       |

### packages/database

| Technology   | Version / note |
|-------------|----------------|
| Prisma      | ^6.1.0         |
| @prisma/client | ^6.1.0      |
| Supabase JS | ^2.47.10       |
| tsx         | ^4.19.2 (dev, for seed) |

### packages/ui

- React 19; exports empty for now; intended for shared Shadcn-style components.

### packages/utils

- No runtime deps; TypeScript only. Exports: `formatNaira`, `koboToNaira`, `nairaToKobo`, `formatRelativeTime`, `formatDate`, `formatDateTime`, `truncate`, `slugify`, `isValidNigerianPhone`, `formatNigerianPhone`, `calculatePercentage`, `debounce`, `cn`.

### Hosting & deployment

- **Netlify** — Next.js via @netlify/plugin-nextjs; build base `apps/web`, publish `.next`; Node 20; Netlify Functions in `netlify/functions` (e.g. process-payouts).

---

## 3. Project Structure

```
foleio-platform/
├── apps/
│   └── web/                          # Next.js 16 application
│       ├── app/                      # App Router
│       │   ├── (auth)/               # Route group: login, signup, forgot-password
│       │   ├── (creator)/            # Route group: creator dashboard (sidebar, content, bookings, etc.)
│       │   ├── (fan)/                # Route group: fan subscriptions page
│       │   ├── admin/                # Admin reconciliation
│       │   ├── api/                  # API routes (see Section 8)
│       │   ├── creator/[username]/   # Public creator profile, content, collections
│       │   ├── creators/             # Creators discovery
│       │   ├── dashboard/             # Dashboard + content edit, collections new (alternate layout)
│       │   ├── onboard/              # Creator onboarding (4 steps)
│       │   ├── payment/              # Payment callback
│       │   ├── tracking/[token]/     # Booking tracking (public)
│       │   ├── layout.tsx            # Root layout (theme, toaster, env validation)
│       │   ├── page.tsx              # Landing (Login / Sign Up)
│       │   └── globals.css           # Tailwind + CSS variables (light/dark)
│       ├── components/               # React components (see Section 6)
│       ├── lib/                      # Server/client libs, actions, config
│       │   ├── actions/              # Server actions (creator, content, booking, etc.)
│       │   ├── auth/                 # Session middleware
│       │   ├── billing/              # cost-monitor
│       │   ├── cloudflare/           # R2, Stream
│       │   ├── config/               # env-validation
│       │   ├── currency/             # currency.ts
│       │   ├── errors/               # error-handler
│       │   ├── forms/                # form-persistence
│       │   ├── mux.ts                # Mux API (video upload/playback)
│       │   ├── paystack.ts           # Paystack API
│       │   ├── queue/                # BullMQ queue-manager, workers (webhook)
│       │   ├── security/             # upload-security
│       │   ├── services/             # upload-manager
│       │   ├── storage/              # R2 client, upload-service (Supabase)
│       │   ├── supabase/             # client.ts, server.ts
│       │   ├── upload/               # upload-gateway
│       │   ├── utils.ts              # serializeForClient, etc.
│       │   └── utils/                # booking, links, serialization, tutorial-access
│       ├── middleware.ts             # Supabase session refresh (all routes)
│       ├── next.config.js            # Turbopack, images, serverActions, webpack externals
│       ├── tailwind.config.ts        # Theme (shadcn-style CSS vars), tailwindcss-animate
│       ├── tests/                    # Vitest setup, e2e (Playwright), utils
│       └── package.json
├── packages/
│   ├── database/
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Full DB schema (see Section 7)
│   │   │   └── seed.ts
│   │   └── src/
│   │       ├── index.ts              # Re-exports Prisma, Supabase, types
│   │       ├── prisma.ts             # Singleton PrismaClient
│   │       └── supabase.ts           # Supabase client (env-based)
│   ├── ui/
│   │   └── src/index.ts              # Empty export (placeholder for shared UI)
│   └── utils/
│       └── src/index.ts              # formatNaira, date/phone helpers, cn, etc.
├── netlify/
│   └── functions/                    # process-payouts.ts (Paystack transfers)
├── scripts/                          # push-env-to-netlify, etc.
├── turbo.json
├── biome.json
├── netlify.toml                      # Build, plugins, headers, CSP
└── package.json
```

---

## 4. Features Built

### By area

- **Auth & onboarding** — Email/password sign up, login, forgot password (Supabase). Creator onboarding: 4 steps (business info, bank details, subscription plan, platform plan); 30-day trial; progress persistence.
- **Creator dashboard** — Welcome message, stats (earnings, subscribers, content views, engagement), recent subscribers, top content, “New Content” / “Withdraw” actions. Uses CreatorSidebar on all creator/dashboard pages.
- **Content** — Create/edit content: title, description, type (video/image/pdf/text), category (content vs tutorial), access (free/subscription/one_time), optional collection, tutorial price; file upload (Stream for video, R2 for others); thumbnail; publish/draft. List with filters; edit content; view on public profile.
- **Collections** — Create/edit collections: title, description, thumbnail, access, price/subscription price, sections. Sections have ordered content (SectionContent). Publish/draft.
- **Intro video** — Creator can choose one existing video as profile intro on public page.
- **Subscriptions (fan → creator)** — Plans (name, price ₦/month, description). Subscription modal: select plan → email/phone → Paystack → success. 15% platform fee. Recurring via Paystack; one active subscription per fan per creator.
- **One-time content / tutorials** — Tutorial purchase and collection subscription: Paystack one-time; 10% platform fee; premium access via 6-digit email code (15 min expiry).
- **Bookings** — Price list (categories, name, price, duration); availability (per-date, optional max bookings); bulk add. Booking modal: service → date → details (name, email, phone, address) → Paystack → tracking link. Status flow: pending → paid → first_payout_done → service_day → completed (or disputed/refunded/cancelled). 60% to creator on payment, 40% after completion; dispute/refund flow.
- **Payouts** — Creator balance; request payout (min ₦1,000); Paystack transfer to bank; payout history (pending/processing/success/failed).
- **Public profile** — `/creator/[username]`: banner, avatar, bio, @username, category, intro video, links (Linktree-style), content grid, subscription plans, services/price list, “Book” / “Subscribe” modals, email signup.
- **Tracking** — `/tracking/[token]`: email verification → status, progress steps, booking details, request refund (with reason).
- **Creators discovery** — `/creators`: list of creators (public).
- **Fan subscriptions** — `(fan)/subscriptions`: manage subscriptions (cancel, etc.).
- **Admin** — Reconciliation: failed webhooks count, processed today, revenue; retry failed webhooks.
- **Settings** — Profile (username, display name, bio, social, avatar, banner, creator links), account (logout). Public profile URL copyable.

---

## 5. Pages & Routes

| Route | Layout | Purpose |
|-------|--------|---------|
| `/` | Root | Landing: “Foleio Platform”, Login / Sign Up |
| `/login` | (auth) | Email + password, Forgot password?, Sign up |
| `/signup` | (auth) | Registration |
| `/forgot-password` | (auth) | Password reset request |
| `/onboard` | Root | Creator onboarding (4 steps) |
| `/dashboard` | dashboard | Creator home (stats, recent subscribers, top content) |
| `/dashboard/content/[id]/edit` | dashboard | Edit content |
| `/dashboard/collections/new` | dashboard | New collection |
| `/content` | (creator) | Content list + tabs (Content, Collections, Intro Video) |
| `/content/new` | (creator) | Create content (form + upload) |
| `/content/tutorials` | (creator) | Tutorials list |
| `/collections` | (creator) | Collections list |
| `/collections/new` | (creator) | New collection |
| `/collections/[id]` | (creator) | Edit collection (sections, content) |
| `/bookings` | (creator) | Booking management (overview, upcoming, disputed, completed) |
| `/availability` | (creator) | Availability calendar |
| `/price-list` | (creator) | Services / price list |
| `/payouts` | (creator) | Balance, request payout, history |
| `/settings` | (creator) | Profile, links, account |
| `/(creator)/admin/add-dummy-data` | (creator) | Add dummy data (dev) |
| `/creator/[username]` | Root | Public creator profile (no login) |
| `/creator/[username]/content/[id]` | Root | Public content view (with paywall/subscribe/purchase) |
| `/creator/[username]/collections/[id]` | Root | Public collection page |
| `/creator/[username]/tutorials` | Root | Public tutorials list |
| `/creators` | Root | Creators discovery |
| `/tracking/[token]` | Root | Booking tracking (email verify → status, refund) |
| `/payment/callback` | Root | Paystack redirect after payment |
| `/(fan)/subscriptions` | (fan) | Fan’s subscriptions |
| `/admin/reconciliation` | Root | Payment reconciliation dashboard |
| `/test` | Root | Test page |

Route groups: `(auth)`, `(creator)`, `(fan)` do not change the URL path.

---

## 6. Components

### UI (components/ui/)

- **accordion, alert, avatar, badge, button, calendar, card, dialog, form, input, label, mux-player, progress, radio-group, select, switch, table, tabs, textarea, toast, toaster, upload-progress, use-toast** — Shadcn/Radix-based primitives and form/feedback components.
- **onboarding-prompt** — Prompts user to complete onboarding when no creator profile.

### Creator (components/creator/)

- **CreatorSidebar** — Left nav: logo, creator block (avatar, name, @username, “View Public Page”), Dashboard, Content, Bookings, Availability, Services, Payouts, Settings.
- **OnboardingRequired** — Shown when user is logged in but has no creator profile.
- **OnboardingFlow** — 4-step onboarding form (business, bank, plan, platform plan).
- **Dashboard** — Stats cards, recent subscribers, top content, actions.
- **Profile** — Settings profile form (username, display name, bio, social, avatar, banner).
- **PublicProfileCard** — Sidebar card with link to public profile.
- **PublicCreatorProfile** — Full public profile page (hero, links, content, plans, services).
- **ContentList** — Content grid with filters, view/edit.
- **CollectionsTab** — Collections list + intro video tab.
- **CreateCollectionForm** — New/edit collection form.
- **CollectionSectionManager** — Sections and section content ordering.
- **CollectionPricingForm** — Access type, price, subscription price.
- **IntroVideoSelector** / **IntroVideoTab** — Choose intro video for profile.
- **SubscriptionModal** — Fan: select plan → details → Paystack.
- **TutorialPurchaseModal** — One-time tutorial purchase.
- **CollectionSubscriptionModal** — Collection subscribe/purchase.
- **PremiumAccessModal** — Email → 6-digit code for gated content.
- **PriceListManager** — CRUD price list items, categories.
- **AvailabilityManager** / **AvailabilityTab** — Availability calendar and bulk.
- **BookingsDashboard** / **UnifiedBookingsManager** — Bookings tabs, stats, complete/refund.
- **PayoutPage** — Balance, request payout form, history.
- **SettingsForm** — Profile + links + account.
- **CreatorLinksManager** — Linktree-style links (add/edit/order).
- **LogoutButton** — Logout action.
- **PublicCollectionPage** — Public collection view (sections, content, paywall).
- **TutorialsPage** — Creator-facing tutorials list.

### Booking (components/booking/)

- **BookingModal** — Multi-step: service → date → details → payment → success; Paystack inline.
- **BookingDashboard** — Stats (services, bookings, revenue, availability).
- **BookingsList** — List of bookings.
- **UnifiedBookingsManager** — Overview/bookings/analytics tabs.
- **AvailabilityManager** — Calendar and bulk availability (used in creator area).
- **PriceListModal** — Read-only price list on public profile.

### Content (components/content/)

- **ContentViewPage** — Public content view (video/image/pdf/text, access checks).
- **EditContentForm** — Edit content metadata (used in dashboard/content/[id]/edit).

### Payment (components/payment/)

- **SubscriptionCheckout** — Plan selection and Paystack subscription flow.

### Creators (components/creators/)

- **CreatorsDiscovery** — Public creators list.

### Fan (components/fan/)

- **Subscriptions** — Fan’s subscription list (e.g. cancel).

### Other

- **theme-provider** — next-themes wrapper (class-based light/dark).
- **ErrorBoundary** — Error boundary wrapper.
- **service-worker-registration** — Registers service worker in production.

---

## 7. Data Models & Database Schema

**Database:** PostgreSQL (Supabase). **ORM:** Prisma. All monetary amounts stored in **kobo** unless noted.

### Core

- **User** — id, email, fullName, avatarUrl, phoneNumber, countryCode (default NG), isCreator, emailVerified, timestamps. Relations: creatorProfile, fanSubscriptions, transactions, usageRecords, uploads.
- **Creator** — userId, username, displayName, bio, category (default makeup), avatarUrl, bannerUrl, instagramHandle, tiktokHandle, introVideoId, platformPlan, platformSubscriptionActive/EndsAt, balance/pendingBalance (kobo), bankDetails, Paystack subaccount/recipient codes, tier (CreatorTier), payoutMethod (PayoutMethod), payoutThreshold, subscriberCount, contentCount, isPublic, verified, bankVerified, timestamps. Enums: CreatorTier (TIER_1/2/3), SubaccountStatus, PayoutMethod (SCHEDULED_BULK, INSTANT, DIRECT_SUBACCOUNT).
- **CreatorPlan** — creatorId, name, description, price (kobo), features (JSON), isActive, orderIndex.
- **FanSubscription** — fanId, creatorId, planId, status (active/canceled/past_due), currentPeriodStart/End, cancelAtPeriodEnd, Paystack subscription/authorization, lastPaymentDate, nextPaymentDate. Unique (fanId, creatorId).

### Content & collections

- **Content** — creatorId, title, description, type (video/image/pdf/text), thumbnailUrl, uploadId, muxAssetId/muxPlaybackId, durationSeconds, fileSizeBytes, accessType (free/subscription/one_time), requiredPlanId, contentCategory (content/tutorial), tutorialPrice (kobo), collectionId, viewCount, likeCount, isPublished, publishedAt, tags.
- **Collection** — creatorId, title, description, thumbnailUrl, accessType, requiredPlanId, price, subscriptionPrice, subscriptionType, viewCount, enrolledCount, isPublished, publishedAt, tags.
- **Section** — collectionId, parentSectionId (optional), title, description, orderIndex.
- **SectionContent** — sectionId, contentId, orderIndex (junction with ordering).

### Payments & payouts

- **Transaction** — reference, userId, creatorId, amount, creatorEarnings, platformFee, feeAmount, netAmount, currency (NGN), status, paymentMethod, paymentType (PaymentMethod enum), gateway (paystack), gatewayResponse, fundsReleased, holdingDays, type (subscription/one_time/payout/platform_fee), metadata.
- **Payout** — creatorId, amount (kobo), status (pending/processing/success/failed), paystackTransferCode, failureReason, transactionIds, processedAt.
- **PlatformSubscription** — creatorId, plan (starter/pro/premium), amount (kobo), status, currentPeriodStart/End, paystackSubscriptionId.

### Links & services

- **CreatorLink** — creatorId, label, url, linkType (instagram/tiktok/twitter/youtube/price_list/custom), icon, orderIndex, isActive.
- **PriceListItem** — creatorId, category, name, description, price (kobo), durationMinutes, orderIndex, categoryOrderIndex, isActive.
- **CreatorAvailability** — creatorId, date (date only), isAvailable, maxBookings. Unique (creatorId, date).

### Bookings

- **Booking** — creatorId, priceListItemId, customerEmail/Name/Phone/Address, bookingDate, notes, totalAmount, firstPayoutAmount, secondPayoutAmount, status (pending/paid/first_payout_done/service_day/completed/disputed/refunded/cancelled), paymentReference, trackingToken, first/secondPayoutTransactionId, disputeReason, disputeStatus, refundTransactionId.

### Access & subscriptions

- **EmailSubscription** — creatorId, email, isActive, unsubscribeToken. Unique (creatorId, email).
- **PremiumAccessCode** — contentId or collectionId, email, code (6-digit), expiresAt, verified, verifiedAt.
- **CollectionSubscription** — collectionId, email, subscriptionType, status, paymentReference, transactionId, expiresAt. Unique (collectionId, email).
- **TutorialPurchase** — contentId, email, paymentReference, transactionId. Unique (contentId, email).

### System

- **Upload** — userId, creatorId, filename, mimeType, size, status (UploadStatus: PENDING/UPLOADING/PROCESSING/COMPLETED/FAILED), muxUploadId/AssetId/PlaybackId, url, error, metadata, timestamps.
- **UsageRecord** — userId, type (UsageType: UPLOAD/STORAGE/BANDWIDTH/TRANSCODING), provider, amount, cost, metadata.

---

## 8. API Routes & Endpoints

| Method | Path | Purpose | Returns / notes |
|--------|------|---------|------------------|
| GET | `/api/creator/me` | Current user + creator profile, plans, collections, etc. | 401 if unauthenticated; creator + nested data or null |
| GET | `/api/creator/profile` | Creator profile by session | Profile payload |
| PUT | `/api/creator/profile` | Update creator profile | Success/error |
| GET | `/api/creators` | List creators (public) | Creators array |
| GET | `/api/creators/[username]` | Creator by username (public) | Creator + plans, content, etc. |
| POST | `/api/content` | Create content | Created content |
| GET | `/api/content/[id]` | Get content by ID | Content (with access checks) |
| PUT | `/api/content/[id]` | Update content | Updated content |
| DELETE | `/api/content/[id]` | Delete content | Success/error |
| GET | `/api/collections` | List collections (for creator) | Collections |
| POST | `/api/collections` | Create collection | Created collection |
| GET | `/api/collections/[id]` | Get collection | Collection + sections/contents |
| PUT | `/api/collections/[id]` | Update collection | Updated collection |
| DELETE | `/api/collections/[id]` | Delete collection | Success/error |
| POST | `/api/collections/subscribe` | Subscribe/purchase collection (Paystack) | Authorization URL or error |
| GET | `/api/availability` | Get availability for creator | Availability array |
| POST | `/api/availability` | Create/update availability | Success/error |
| POST | `/api/availability/bulk` | Bulk add availability | Success/error |
| GET | `/api/services` | Price list items for creator | PriceListItem[] |
| POST | `/api/services` | Create price list item | Created item |
| PUT | `/api/services/[id]` | Update price list item | Updated item |
| DELETE | `/api/services/[id]` | Delete price list item | Success/error |
| POST | `/api/bookings/create` | Create booking (customer details + Paystack init) | Payment URL / error |
| POST | `/api/bookings/verify-payment` | Verify Paystack payment, confirm booking, first payout | Success/error |
| PUT | `/api/bookings/verify-payment` | Legacy verify (body: reference, bookingId) | — |
| POST | `/api/bookings/complete` | Mark booking service completed (release 40%) | Success/error |
| POST | `/api/bookings/refund-request` | Customer requests refund (dispute) | Success/error |
| GET | `/api/tracking/[token]` | Get booking by token (for tracking page) | Booking + creator/service |
| POST | `/api/tracking/[token]` | Verify email for tracking (body: email) | Booking + verified |
| POST | `/api/subscribe` | Fan subscribe to creator (plan, email, phone) | Paystack auth URL or error |
| DELETE | `/api/subscribe` | Unsubscribe (cancel at period end) | Success/error |
| POST | `/api/payments/initialize` | Initialize Paystack payment (subscription/one-time) | Authorization URL |
| GET | `/api/payments/verify/[reference]` | Verify Paystack transaction by reference | Verification result |
| POST | `/api/tutorials/purchase` | One-time tutorial purchase (Paystack) | Payment URL / error |
| POST | `/api/premium/send-code` | Send 6-digit premium access code to email | Success/error |
| POST | `/api/premium/verify-code` | Verify code, grant access (cookie) | Success/error |
| POST | `/api/analytics/track` | Track content view / event | Success/error |
| POST | `/api/upload/stream` | Upload video (Mux/Stream) | Mux upload URL + asset/playback IDs, etc. |
| GET | `/api/upload/status/[muxUploadId]` | Mux upload status | Status payload |
| POST | `/api/upload/r2` | Upload file to R2 (image/PDF) | URL, key, etc. |
| DELETE | `/api/upload/r2` | Delete R2 object | Success/error |
| POST | `/api/upload/profile` | Upload profile image/thumbnail (Supabase or R2) | URL |
| POST | `/api/webhooks/paystack` | Paystack webhook (charge.success, subscription, transfer) | 200 OK |
| GET | `/api/admin/reconciliation/stats` | Reconciliation stats (failed, processed, revenue) | Stats + recent failures |
| POST | `/api/admin/reconciliation/retry` | Retry failed webhook (body: webhookId) | Success/error |
| POST | `/api/admin/add-dummy-data` | Seed dummy data (dev) | Success/error |
| GET | `/api/health/env-check` | Environment check (DB, Mux, Supabase) | Env status (no secrets) |

---

## 9. Authentication & Authorization

### Provider

- **Supabase Auth** — Email/password; session in cookies; `createClient()` from `@/lib/supabase/server` in Server Components/API, client from `@/lib/supabase/client` for client-side.

### Middleware

- **middleware.ts** — Runs on all routes (except static assets). Creates Supabase server client with cookie get/set; calls `supabase.auth.getUser()` to refresh session. Does not redirect; layout/server logic enforces access.

### Protected routes

- **Creator area** — `(creator)/layout.tsx`: requires session; if no session → redirect `/login`. If session but no creator profile → render `OnboardingRequired` (no redirect).
- **Dashboard** — `dashboard/layout.tsx`: if no user → still renders children (no redirect); if user and creator → sidebar; if user and no creator → children without sidebar (onboarding can be shown in page).
- **Onboard** — Accessible when logged in; completion creates creator and redirects to dashboard/content.

### Roles

- **User** — Logged-in; may or may not have creator profile.
- **Creator** — User with `Creator` record; can access content, bookings, payouts, settings, etc.
- **Fan/Customer** — No account required for subscribe/purchase/book; identified by email/phone; some flows use PremiumAccessCode or CollectionSubscription/TutorialPurchase by email.
- **Admin** — No dedicated role in schema; reconciliation routes check session (any logged-in user in current impl).

### Public (no login)

- `/`, `/login`, `/signup`, `/forgot-password`, `/creator/[username]`, `/creator/[username]/content/[id]`, `/creator/[username]/collections/[id]`, `/creator/[username]/tutorials`, `/creators`, `/tracking/[token]`, `/payment/callback`.

---

## 10. State Management

- **No global store** — No Redux, Zustand, or global client store.
- **Server state** — Data fetched in Server Components (e.g. dashboard, creator layout) or via `fetch`/API from client. Creator profile/session from `/api/creator/me` or layout load.
- **Local state** — React `useState`, `useEffect` in client components. Forms: **react-hook-form** with **zod** + **@hookform/resolvers**.
- **URL state** — Next.js `useRouter`, `useSearchParams` for navigation and simple query state.
- **Persistence** — Onboarding: `lib/forms/form-persistence.ts` (e.g. localStorage) to restore draft. Premium access: cookie set by `/api/premium/verify-code`.
- **Toasts** — `@/components/ui/toaster` + `useToast()` for success/error feedback.

---

## 11. Third-Party Integrations

| Service | Purpose | Where |
|---------|---------|--------|
| **Supabase** | Auth (email/password), optional storage (profile/thumbnails) | lib/supabase/*, middleware, env |
| **Paystack** | Payments (one-time, recurring), transfers to Nigerian banks | lib/paystack.ts, webhook route, booking/subscribe/tutorial/collection flows |
| **Mux** | Video upload (direct upload URL), playback | lib/mux.ts, api/upload/stream, upload-manager |
| **Cloudflare Stream** | Alternative video host (account ID, API token) | lib/cloudflare/stream.ts, PublicCollectionPage iframe |
| **Cloudflare R2** | File storage (images, PDFs) | lib/cloudflare/r2.ts, lib/storage/r2-client.ts, api/upload/r2 |
| **AWS S3** | Optional (SDK present) | @aws-sdk/client-s3 in package.json; not central in current flows |
| **Redis** | BullMQ queue backend (webhook retries, etc.) | REDIS_URL, lib/queue/queue-manager.ts, workers |
| **Sentry** | Error monitoring (production) | lib/sentry.ts, NEXT_PUBLIC_* / SENTRY_DSN |
| **Resend** | Email (planned; not wired) | Referenced in lib/actions/email.ts as TODO |

---

## 12. Environment Variables

**Source of truth:** `apps/web/lib/config/env-validation.ts` (required list). Additional vars found in codebase.

### Required (validation)

- `NEXT_PUBLIC_APP_URL` — App base URL (callbacks, links).
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client.
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side Supabase (e.g. storage, admin).
- `DATABASE_URL` — PostgreSQL connection (Prisma).
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY` — Paystack.
- `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET` — Mux API (video upload/playback).

### Recommended (validation)

- `REDIS_URL` — Redis for BullMQ (e.g. `redis://...`).
- `SENTRY_DSN` — Sentry error reporting.
- `NODE_ENV` — development | production.

### Other (from codebase)

- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_BUCKET_NAME`, `CLOUDFLARE_R2_PUBLIC_URL` — R2 in api/upload/r2 and lib/storage/r2-client.
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_R2_*` (alternate names in scripts) — Cloudflare Stream/R2 in lib/cloudflare/*.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` — Alternative R2 naming in lib/storage/r2-client.ts.
- `NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID` — Stream iframe origin (PublicCollectionPage).
- `REDIS_HOST`, `REDIS_PORT` — Fallback in webhook worker if REDIS_URL not used.
- `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` — Scripts (push-env-to-netlify, etc.).
- `RESEND_API_KEY` — Referenced in email actions (TODO; not used yet).

**No actual values** should be committed; use `.env.local` or Netlify env.

---

## 13. Known Issues & TODOs

### TODOs in code

- **lib/security/upload-security.ts** — “Add storage tracking fields to user model”; “Check storage quota”.
- **lib/actions/booking.ts** — “Integrate with Paystack transfer API” for first payout, second payout, and refund (logic exists but TODOs note full Paystack transfer/refund wiring).
- **lib/monitoring/system-monitor.ts** — “Integrate with external monitoring service”.
- **lib/billing/cost-monitor.ts** — “Send email notification” on threshold; “Send email notification and potentially suspend uploads”.
- **apps/web/app/api/upload/r2/route.ts** — “Implement refund logic” (e.g. on delete).
- **lib/actions/email.ts** — Multiple “Integrate with Resend” (sendBookingConfirmationEmail, subscription emails, etc.); email currently stubbed or not sent.

### Other notes

- **Webhook dependency** — Subscription and payment state depend on Paystack webhooks; failed webhooks are queued (BullMQ) and retried from admin reconciliation; no automatic reconciliation job documented.
- **Duplicate verification** — Risk of duplicate subscription creation if verify endpoint called multiple times (noted in analysis docs).
- **Rate limiting** — Not applied consistently across APIs (uploads, payments, subscribe).
- **Admin auth** — Reconciliation routes check session only; no dedicated admin role.
- **Platform plans** — Starter/Pro/Premium and 30-day trial are in schema and onboarding; gating of features by plan may be partial.

---

## 14. UI & Styling Approach

- **Design system** — Shadcn/UI style: CSS variables in `globals.css` for light/dark (`:root` and `.dark`), semantic tokens (background, foreground, primary, secondary, muted, accent, destructive, border, input, ring, card, popover), `--radius` for borders.
- **Tailwind** — `tailwind.config.ts` maps these to `theme.extend.colors` and `borderRadius`; `tailwindcss-animate` for accordion and similar; content paths include `app`, `components`, `pages`, and `packages/ui/src`.
- **Components** — Radix UI primitives (accordion, dialog, select, tabs, toast, etc.) with Tailwind classes; `cn()` (or `@foleio/utils` cn) for conditional classes; `class-variance-authority` where used.
- **Font** — Inter (next/font/google) in root layout.
- **Theming** — `ThemeProvider` (next-themes), `attribute="class"`, defaultTheme light, enableSystem, no transition on change.
- **Conventions** — Component files in `components/` (ui for primitives, creator/booking/content/payment/fan/creators for feature components); form patterns use Form/FormField/FormItem/FormControl from ui/form with Label/Input/Textarea/Select/Switch; cards for sections; tabs for multi-view pages; toaster for feedback.

---

*Document generated from codebase analysis. Last updated: February 2025.*

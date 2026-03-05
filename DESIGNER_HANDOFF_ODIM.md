# Foleio Platform — Full UI/UX Design Handoff

**Purpose:** Give your designer everything needed to create a custom UI/UX for Foleio (Nigerian creator monetization platform).  
**Product:** Subscriptions, content/courses, service bookings, payouts, public creator profiles.  
**Tech context:** Next.js 16, Tailwind, Shadcn/ui. Design can be fully custom; structure and content below are the source of truth.

---

## 1. App structure and entry points

| Route | Who sees it | Purpose |
|-------|-------------|--------|
| `/` | Everyone | Landing: title "Foleio Platform", tagline "Your work. Your world. Your Foleio.", Login + Sign Up buttons |
| `/login` | Guest | Email + password, "Forgot password?" link, "Sign up" link |
| `/signup` | Guest | Registration form |
| `/forgot-password` | Guest | Password reset request |
| `/onboard` | New user (no creator profile) | 4-step creator onboarding (see Section 4) |
| `/dashboard` | Creator (logged in) | Main creator home (sidebar + dashboard content) |
| `/creator/[username]` | Public | Creator’s public profile (Linktree-style, no login) |
| `/tracking/[token]` | Customer | Booking tracking by token + email verification |

**Creator area (all behind login + creator profile):**  
Dashboard, Content, Bookings, Availability, Services (Price list), Payouts, Settings.  
Sidebar is visible on all these pages (except when onboarding or not yet a creator).

---

## 2. Creator sidebar (main nav)

**Location:** Left side, fixed; hidden on small screens (e.g. `lg:` breakpoint), so mobile needs an alternative (e.g. hamburger + drawer).

**Content (top to bottom):**

1. **Brand**
   - Logo/wordmark: **"Foleio"** (links to `/dashboard`).

2. **Creator block**
   - Avatar (or initial if no image).
   - Display name (e.g. "Jane Doe").
   - @username (e.g. "@jane").
   - Button/link: **"View Public Page"** (opens `/creator/[username]` in new tab). Icon: external link.

3. **Nav items (icon + label)**
   - **Dashboard** → `/dashboard` (e.g. LayoutDashboard icon).
   - **Content** → `/content` (Video icon).
   - **Bookings** → `/bookings` (Calendar icon).
   - **Availability** → `/availability` (Clock icon).
   - **Services** → `/price-list` (FileText icon).
   - **Payouts** → `/payouts` (Wallet icon).
   - **Settings** → `/settings` (Settings icon).

**Behavior:** Active route highlighted (e.g. filled background + contrast text). Hover state for inactive items. Sidebar scrollable if content overflows.

---

## 3. Page-by-page: what’s on screen

### 3.1 Dashboard (`/dashboard`)

- **Header**
  - Title: "Welcome back, {displayName}".
  - Subtitle: "Here's what's happening with your creator account".
  - Primary actions: **"New Content"** (→ `/content/new`), **"Withdraw {balance}"** (→ payouts; disabled if balance &lt; ₦10).

- **Stats row (4 cards)**
  - Total Earnings (₦, with % vs last month).
  - Subscribers (count, % vs last month).
  - Content Views (count, % vs last month).
  - Engagement Rate (%, % vs last month).  
  Each card: title, value, optional "from last month" change (green/red/neutral).

- **Two cards below**
  - **Recent Subscribers:** List of recent subscribers; each row: name (or "Anonymous"), plan price badge (e.g. ₦X/month), date. Subtitle: "X new subscribers this month".
  - **Top Performing Content:** List of top content; each row: title, view count, type badge. Subtitle: "Your most viewed content this month".

**Empty/onboarding states:** If user has no creator profile → show onboarding prompt (steps 0/4). If profile exists but basics missing → show shorter onboarding flow (basic info, social, pricing).

---

### 3.2 Content (`/content`)

- **Page header**
  - Title: "Content".
  - Subtitle: "Manage your content, collections, and intro video".
  - Optional: "Manage Bookings" button (→ bookings).

- **Tabs**
  1. **Content**
     - "Create New Content" button (→ `/content/new`).
     - Grid of content cards. Each card: thumbnail (optional), title, short description, type badge (video/image/pdf/text), Published/Draft badge, view count, date, **View** (opens public content page), **Edit** (→ `/dashboard/content/[id]/edit`).
     - Empty state: "No content yet. Create your first piece of content!" + Create button.
  2. **Collections**
     - "New Collection" button (→ `/collections/new`).
     - Grid of collection cards: thumbnail, title, description, "X section(s)" badge, optional price/enrollment info, click → collection detail.
     - Empty state: "No collections yet. Create your first collection..." + Create button.
  3. **Intro Video**
     - Select which existing video is the profile intro; preview; save. Used on public profile.

---

### 3.3 New content (`/content/new`)

- Form:
  - **Title** (required).
  - **Description** (optional).
  - **Type:** video | image | pdf | text.
  - **Access:** free | subscription | one_time.
  - **Category:** content | tutorial (tutorial can link to a collection and have optional tutorial price).
  - **Collection** (optional dropdown if tutorial).
  - **Tutorial price** (optional, ₦, if one_time tutorial).
  - **Publish:** toggle (default on).
  - **File upload:** main file (video → Cloudflare Stream; image/PDF/text → R2). Show upload progress/status.
  - **Thumbnail** (optional image upload).
- Actions: Submit (Create content), Cancel/Back.

---

### 3.4 Collections

- **List** (`/collections`): Same as Content → Collections tab; "New Collection" → `/collections/new`.
- **New/Edit collection** (`/collections/new`, `/collections/[id]`):
  - Title, description, thumbnail.
  - Access type (free / subscription / one_time), optional price or subscription price.
  - **Sections:** Add/remove sections; each section has title, optional description, order. Within sections: add/remove/reorder content (link to existing content). So: Collection → Sections → Section contents (ordered).
  - Publish toggle, tags optional.
  - Save / Cancel.

---

### 3.5 Bookings (`/bookings`)

- **Header**
  - Title: "Booking Management".
  - Subtitle: "Manage your services, availability, and customer bookings all in one place".

- **Tabs**
  - **Overview / Recent:** Recent bookings list; quick stats if desired.
  - **Upcoming:** Bookings with status paid, first_payout_done, service_day. Each row: customer name, email, phone, date, service name, amount, status badge. Actions: **Complete service**, **Refund** (opens dialog with reason).
  - **Disputed:** Status = disputed. Show dispute reason; actions: Approve refund / Reject refund.
  - **Completed:** Status = completed, refunded, cancelled. Read-only list.

- **Booking status flow (for badges/labels)**  
  pending → paid → first_payout_done → service_day → completed (or disputed / refunded / cancelled).

- **Refund dialog:** Reason (textarea), Submit request, Cancel.

---

### 3.6 Availability (`/availability`)

- **Header**
  - Title: "Availability Calendar".
  - Subtitle: "Set your working hours and manage when clients can book with you".
  - Legend: e.g. green = Available, red = Unavailable.

- **Main UI**
  - Calendar view (e.g. next 90 days). Dates can be marked available/unavailable; optional per-date **max bookings**.
  - Bulk actions if needed (e.g. set week available). Add/remove availability, optional recurring pattern (e.g. “every Monday”).

---

### 3.7 Services / Price list (`/price-list`)

- **Header**
  - Title: "Price List".
  - Subtitle: "Manage your service offerings and prices for bookings".

- **List of services**
  - Each item: category (optional), name, description (optional), price (₦), duration (minutes, optional), order, active toggle. Actions: Edit, Delete, drag handle for reorder.
  - Categories can be used to group (e.g. "HOME SERVICE", "PHOTOSHOOT"). Order: category order, then order within category.

- **Add/Edit service (modal or inline)**
  - Category (optional text or dropdown).
  - Name, description, price (₦, min ₦1), duration (minutes). Save / Cancel.

---

### 3.8 Payouts (`/payouts`)

- **Header**
  - Title: "Payouts".
  - Subtitle: "Request payouts from your earnings".

- **Available balance card**
  - Big number: balance in ₦.
  - Note: "Minimum payout: ₦1,000".

- **Request payout (if balance ≥ ₦1,000)**
  - Amount (₦), min 1000, max = available balance. Button: "Request Payout".

- **Payout history**
  - List: date, amount, status (pending / processing / success / failed), optional failure reason.

---

### 3.9 Settings (`/settings`)

- **Header**
  - Title: "Settings".
  - Subtitle: "Manage your profile and account settings".

- **Tabs**
  1. **Profile**
     - **Public profile card:** Public URL (copyable), e.g. `https://app.com/creator/username`, "View Public Page" link.
     - **Profile form:** Username (lowercase, 3–30 chars), display name, bio, Instagram handle, TikTok handle. Avatar upload, banner upload (optional).
     - **Creator links (Linktree-style):** List of links. Each: label, URL, type (Instagram, YouTube, Twitter, TikTok, Price list, Custom). Order (drag), active toggle. Add link / Edit / Delete.
  2. **Account**
     - Logout button.

---

## 4. Onboarding (`/onboard`)

**4 steps, progress bar, one card per step.**

- **Step 1 – Business information**
  - Display name, bio, category (Makeup, Fashion, Fitness, Food, Lifestyle, Other), Instagram handle, TikTok handle. Next.

- **Step 2 – Bank details**
  - Bank (dropdown: Nigerian banks), account number, account name, BVN (optional). Back / Next.

- **Step 3 – Subscription plan**
  - Plan name, monthly price (₦, min ₦10), description (optional). Back / Next.

- **Step 4 – Platform subscription**
  - Plan: Starter (Free, 30-day trial), Pro (₦5,000/month), Premium (₦15,000/month). Back / "Complete Setup".

Optional: "Progress restored" message if returning user had draft in browser.

---

## 5. Public creator profile (`/creator/[username]`)

**No login.** Linktree-style single page.

- **Hero**
  - Banner image (optional), avatar, display name, @username, bio, category. Optional: intro video (playable).

- **Links**
  - List of creator links (icon by type: Instagram, YouTube, Twitter, TikTok, custom). Each: label + URL (opens in new tab).

- **Content**
  - Tabs or sections: e.g. **Content** (posts/videos) vs **Tutorials** (courses/collections). Grid of cards: thumbnail, title, view count, access (free / subscription / one-time). Click → content view or paywall/subscribe.

- **Subscription plans**
  - Cards: plan name, price (₦/month), description. CTA: "Subscribe" → opens **Subscription modal**.

- **Services / Book**
  - Price list grouped by category. Each service: name, price, duration (if any). CTA: "Book" → opens **Booking modal**. Optional: show availability (e.g. next 3 months with available dates).

- **Email signup**
  - Optional: "Subscribe to updates" (email capture for creator’s list).

---

## 6. Modals and overlays

### 6.1 Subscription modal (fan subscribes to creator)

- **Step 1 – Select plan:** List of plans (name, price, description). Choose one → Next.
- **Step 2 – Details:** Email, phone. "Pay with Paystack" / "Subscribe" → redirect to Paystack; return to success/callback.
- **Step 3 – Processing / Success:** Loading or "Success, you’re subscribed".

### 6.2 Booking modal (customer books a service)

- **Step 1 – Service:** Show selected service (name, price, duration). Confirm or go back.
- **Step 2 – Date:** Calendar or list of available dates (from availability). Single or multiple dates if allowed. Next.
- **Step 3 – Details:** Name, email, phone, address (required for delivery), notes. Next.
- **Step 4 – Payment:** Create booking → get payment link (Paystack). "Pay now" → redirect. Next.
- **Step 5 – Success:** "Booking created"; show tracking link (e.g. copy link, open `/tracking/[token]`).

### 6.3 Premium access modal (unlock paid content with email code)

- **Step 1 – Email:** Enter email. "Send code" → API sends 6-digit code (15 min expiry).
- **Step 2 – Code:** Enter 6-digit code. "Verify" → grant access (e.g. set cookie, close modal, play content).
- **States:** Success, Error (invalid/expired code), Loading.

### 6.4 Collection subscription / tutorial purchase modals

- Similar to subscription or one-time payment: select plan or product, enter email/phone, pay via Paystack, success message or redirect.

### 6.5 Price list modal (on public profile)

- When "Price list" link is clicked: show same services/price list in a modal or bottom sheet (read-only), with "Book" per service if needed.

---

## 7. Tracking page (`/tracking/[token]`)

**Two phases:**

1. **Not verified**
   - Title: "Track Your Booking". Subtitle: "Enter the email address you used to make this booking." Email input, "View Booking" button. If token invalid or not found: "Booking Not Found" message.

2. **Verified**
   - **Status badge:** Pending Payment | Paid | Confirmed | Service Day | Completed | Disputed | Refunded | Cancelled.
   - **Progress steps (vertical):** e.g. Payment received → Confirmed → Service day → Completed (with short descriptions). Current step highlighted; completed steps with check.
   - **Booking details card:** Creator (avatar, name, @username), service name (and category), date, amount paid, notes.
   - **Refund:** If status is paid / first_payout_done / service_day: "Request Refund" button → dialog with reason textarea → Submit.
   - **Disputed state:** If disputed, show "Refund Requested" and reason; message that creator is reviewing.

---

## 8. Auth pages

- **Login:** Card with title "Login to Foleio", email, password, "Forgot password?", "Login" button, "Sign up" link.
- **Sign up:** Registration form (email, password, etc. as implemented).
- **Forgot password:** Email input, send reset link.

---

## 9. Reusable UI elements to design

- **Cards:** Content cards, collection cards, stats cards, booking rows.
- **Badges:** Status (booking, payout, content publish), type (video/pdf/etc.), plan price.
- **Buttons:** Primary, secondary, outline, destructive; loading state (spinner).
- **Forms:** Input, textarea, select, switch, file upload (with progress).
- **Tabs:** Content vs Collections vs Intro video; Bookings tabs; Settings Profile vs Account.
- **Modals/Dialogs:** Subscription, Booking, Premium access, Refund, Add/Edit service, Add/Edit link.
- **Toasts:** Success / error messages (e.g. after save, payout request, refund).
- **Empty states:** No content, no collections, no bookings, no payouts, no links.
- **Tables/Lists:** Bookings, payouts, subscribers, top content, price list.
- **Calendar:** Availability (date grid, available/unavailable, optional max bookings).
- **Progress:** Onboarding step progress; booking progress steps; upload progress.

---

## 10. Copy and labels reference

- **Product name:** Foleio. Tagline: "Your work. Your world. Your Foleio."
- **Currency:** Naira (₦). All amounts in whole Naira unless specified (backend uses kobo).
- **Min payout:** ₦1,000. Min plan price: ₦10.
- **Categories (creator):** Makeup, Fashion, Fitness, Food, Lifestyle, Other.
- **Content types:** video, image, pdf, text.
- **Access types:** free, subscription, one_time.
- **Link types:** Instagram, YouTube, Twitter, TikTok, Price list, Custom.
- **Platform plans:** Starter (Free, 30-day trial), Pro (₦5,000/month), Premium (₦15,000/month).

---

## 11. Flows to wireframe end-to-end

1. **New user → Creator:** Sign up → Login → Onboarding (4 steps) → Dashboard.
2. **Creator adds content:** Content → New content → Upload file → Set access → Publish.
3. **Creator creates collection:** Content → Collections → New → Add sections → Add content to sections → Set price/access → Publish.
4. **Fan subscribes:** Public profile → Choose plan → Subscription modal (plan → email/phone → Paystack) → Success.
5. **Customer books:** Public profile → Services → Book → Booking modal (service → date → details → payment) → Tracking page.
6. **Fan unlocks premium content:** Public profile → Click locked content → Premium access modal (email → code) → View content.
7. **Creator manages booking:** Bookings → Upcoming → Complete service / Refund (with reason).
8. **Creator requests payout:** Payouts → Enter amount → Request payout → History.

Use this doc as the single source of truth for structure, content, and flows; your designer can then apply a new visual language, components, and layout while keeping the same features and UX.

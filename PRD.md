# Foleio Platform - Product Requirements Document

## PART 2: FEATURE SPECIFICATION

### 2.1 User Stories (from what's implemented)

#### **Authentication & Onboarding**
- **Role:** New Creator
  **Action:** Complete multi-step onboarding with business info, bank details, subscription plans, and platform plan selection
  **Evidence:** `/app/onboard/page.tsx` + `createCreatorProfile()` in `/lib/actions/creator.ts`
  **Status:** ✅ IMPLEMENTED

- **Role:** User
  **Action:** Sign up and log in with email/password authentication
  **Evidence:** Supabase auth integration in `/lib/supabase/server.ts` and auth pages in `/app/(auth)/`
  **Status:** ✅ IMPLEMENTED

#### **Content Management**
- **Role:** Creator
  **Action:** Upload and manage different content types (videos, images, PDFs, text) with Cloudflare Stream integration
  **Evidence:** `/api/upload/stream/route.ts` + `/lib/cloudflare/stream.ts` + Content models in database schema
  **Status:** ✅ IMPLEMENTED

- **Role:** Creator
  **Action:** Create and manage collections/courses with hierarchical sections
  **Evidence:** `Collection` and `Section` models + `/components/creator/CollectionsTab.tsx` + collection CRUD actions
  **Status:** ✅ IMPLEMENTED

- **Role:** Creator
  **Action:** Set access controls (free, subscription, one-time) for content and collections
  **Evidence:** `accessType` and `requiredPlanId` fields in Content/Collection models + access control logic
  **Status:** ✅ IMPLEMENTED

#### **Subscription & Monetization**
- **Role:** Creator
  **Action:** Create multiple subscription plans with different pricing tiers
  **Evidence:** `CreatorPlan` model + plan management in onboarding step 3 + `/lib/actions/creator.ts`
  **Status:** ✅ IMPLEMENTED

- **Role:** Fan
  **Action:** Subscribe to creators with recurring payments via Paystack
  **Evidence:** `/api/subscribe/route.ts` + `FanSubscription` model + Paystack subscription integration
  **Status:** ✅ IMPLEMENTED

- **Role:** Fan
  **Action:** Purchase individual tutorials or collections
  **Evidence:** `/api/tutorials/purchase/route.ts` + `/api/collections/subscribe/route.ts` + payment processing
  **Status:** ✅ IMPLEMENTED

#### **Booking System**
- **Role:** Creator
  **Action:** Create and manage service price lists with categories and durations
  **Evidence:** `PriceListItem` model + `/components/creator/PriceListManager.tsx` + availability management
  **Status:** ✅ IMPLEMENTED

- **Role:** Creator
  **Action:** Set availability dates for booking services
  **Evidence:** `CreatorAvailability` model + `/components/creator/AvailabilityManager.tsx`
  **Status:** ✅ IMPLEMENTED

- **Role:** Customer
  **Action:** Book creator services with payment processing and tracking
  **Evidence:** `/api/bookings/create/route.ts` + `Booking` model + tracking tokens + `/app/tracking/[token]/page.tsx`
  **Status:** ✅ IMPLEMENTED

- **Role:** Creator
  **Action:** Track booking status and manage payouts (60% to creator, 40% held)
  **Evidence:** Booking status tracking + payout calculations in `Booking` model + dispute handling
  **Status:** ✅ IMPLEMENTED

#### **Payment & Payouts**
- **Role:** Creator
  **Action:** Receive automated payouts to Nigerian bank accounts via Paystack
  **Evidence:** Paystack subaccount integration + `Payout` model + `/netlify/functions/process-payouts.ts`
  **Status:** ✅ IMPLEMENTED

- **Role:** Platform Admin
  **Action:** Process creator payouts and handle payment disputes
  **Evidence:** Payout processing logic + dispute status tracking in `Booking` model
  **Status:** ⚠️ PARTIAL (Netlify function exists but may need webhook integration)

#### **Analytics & Tracking**
- **Role:** Creator
  **Action:** View comprehensive dashboard with subscriber metrics, earnings, and content performance
  **Evidence:** `/components/creator/Dashboard.tsx` + `/lib/actions/analytics.ts` + analytics API endpoints
  **Status:** ✅ IMPLEMENTED

- **Role:** Creator
  **Action:** Track content views, likes, and engagement metrics
  **Evidence:** `viewCount`, `likeCount` fields in Content model + `/api/analytics/track/route.ts`
  **Status:** ⚠️ PARTIAL (tracking exists but analytics display may be basic)

#### **Premium Access & Verification**
- **Role:** Fan
  **Action:** Access premium content through email verification codes
  **Evidence:** `/api/premium/send-code/route.ts` + `/api/premium/verify-code/route.ts` + `PremiumAccessCode` model
  **Status:** ✅ IMPLEMENTED

- **Role:** Fan
  **Action:** Subscribe to collections and receive email-based access codes
  **Evidence:** Collection subscription flow + access code email sending in `/lib/actions/collection-access.ts`
  **Status:** ✅ IMPLEMENTED

#### **Public Profiles & Marketing**
- **Role:** Creator
  **Action:** Manage public profile with bio, social links, and Linktree-style page
  **Evidence:** `/app/creator/[username]/page.tsx` + `CreatorLink` model + profile management components
  **Status:** ✅ IMPLEMENTED

- **Role:** Creator
  **Action:** Manage email subscriptions for fan updates and marketing
  **Evidence:** `/api/subscribe/route.ts` + `EmailSubscription` model + email action functions
  **Status:** ✅ IMPLEMENTED

### 2.2 Functional Requirements

#### A. Happy Path Flows (from current code)

**Creator Onboarding Flow:**
✅ IMPLEMENTED: User signs up → completes 4-step form (business info, bank details, subscription plan, platform plan) → profile created with 30-day trial

**Content Upload Flow:**
✅ IMPLEMENTED: Creator uploads file → Cloudflare processes → content record created → accessible based on access controls

**Subscription Flow:**
✅ IMPLEMENTED: Fan selects plan → Paystack processes payment → FanSubscription created → recurring payments handled automatically

**Booking Flow:**
✅ IMPLEMENTED: Customer selects service + date → provides contact info → pays → booking confirmed → creator gets 60% payout immediately

**Payout Flow:**
✅ IMPLEMENTED: Creator requests payout → balance validated → Paystack transfer initiated → payout recorded → balance updated

**Premium Access Flow:**
✅ IMPLEMENTED: User requests access → pays/subscribes → receives 6-digit code via email → enters code → gets temporary access

**Analytics Dashboard Flow:**
✅ IMPLEMENTED: Creator logs in → system aggregates metrics → displays views, subscribers, revenue, recent transactions

#### B. Edge Cases & 'What Ifs' (both handled and missing)

**Handled Edge Cases:**
- ✅ Username conflicts: Auto-generates unique username with timestamp
- ✅ Session validation: Checks Supabase session before sensitive operations
- ✅ Input validation: Comprehensive Zod schemas for all forms
- ✅ Date availability: Checks creator availability and booking limits
- ✅ Payment verification: Paystack verification before subscription activation
- ✅ Code expiration: 15-minute expiration on access codes
- ✅ Balance validation: Checks sufficient funds before payouts

**Missing Edge Cases:**
- ❌ Race conditions: No protection against concurrent operations
- ❌ Rate limiting: Missing across most APIs (uploads, payments, subscriptions)
- ❌ File size limits: No explicit file size validation
- ❌ Payment timeouts: No handling for abandoned payments
- ❌ Duplicate content: No detection of duplicate uploads
- ❌ Content moderation: No automated content filtering
- ❌ Device limits: No concurrent access restrictions
- ❌ Subscription plan changes: No upgrade/downgrade logic
- ❌ Service rescheduling: No ability to change booking dates
- ❌ Bank account validation: No verification of account details
- ❌ Time zone handling: No explicit timezone support

#### C. Business Rules (extracted from logic)

**Monetization Rules:**
- ✅ All amounts stored in kobo (₦ × 100) for precision
- ✅ Platform takes 10% fee on collection subscriptions
- ✅ Booking split: 60% to creator immediately, 40% held until service completion
- ✅ Platform subscription starts with 30-day trial regardless of plan
- ✅ Paystack handles recurring billing with stored authorization codes

**Access Control Rules:**
- ✅ Content access types: free, subscription, one_time
- ✅ One active subscription per fan per creator
- ✅ Free content always accessible without verification
- ✅ Collection access grants access to all contained tutorials
- ✅ Access codes expire after 15 minutes

**Operational Rules:**
- ✅ Username generated from display name with URL-safe formatting
- ✅ Customer email/phone/address required for bookings
- ✅ Unique tracking tokens for booking management
- ✅ Creator marked as `isCreator: true` after onboarding
- ✅ Email subscriptions unique per creator (one per email)

## PART 3: TECHNICAL ARCHITECTURE

### 3.1 Data Models (from schema/models)

#### **Core User Models**
- ✅ IMPLEMENTED: `User` - Extended Supabase auth with creator status, profile info
- ✅ IMPLEMENTED: `Creator` - Creator profiles with business info, payment settings, social handles
- ✅ IMPLEMENTED: `CreatorPlan` - Subscription plans with pricing and features
- ✅ IMPLEMENTED: `FanSubscription` - Fan subscriptions with payment tracking

#### **Content Models**
- ✅ IMPLEMENTED: `Content` - All content types with access controls and metadata
- ✅ IMPLEMENTED: `Collection` - Courses/playlists with pricing and enrollment
- ✅ IMPLEMENTED: `Section` - Hierarchical sections within collections
- ✅ IMPLEMENTED: `SectionContent` - Junction table linking content to sections

#### **Monetization Models**
- ✅ IMPLEMENTED: `PriceListItem` - Service offerings for bookings
- ✅ IMPLEMENTED: `CreatorAvailability` - Available dates for booking services
- ✅ IMPLEMENTED: `Booking` - Customer bookings with payment tracking
- ✅ IMPLEMENTED: `Transaction` - All payment transactions and transfers
- ✅ IMPLEMENTED: `Payout` - Creator payout processing and tracking

#### **Access Control Models**
- ✅ IMPLEMENTED: `PremiumAccessCode` - Email verification for premium content
- ✅ IMPLEMENTED: `CollectionSubscription` - Email-based collection access
- ✅ IMPLEMENTED: `TutorialPurchase` - Individual tutorial purchases
- ✅ IMPLEMENTED: `EmailSubscription` - Fan email subscriptions for updates

#### **Platform Management Models**
- ✅ IMPLEMENTED: `PlatformSubscription` - Creator platform subscription plans
- ✅ IMPLEMENTED: `CreatorLink` - Linktree-style social media links

### 3.2 System Components (from file structure)

#### **Frontend Components**
- ✅ IMPLEMENTED: `CreatorSidebar` - Main navigation for creators
- ✅ IMPLEMENTED: `CreatorDashboard` - Analytics and overview dashboard
- ✅ IMPLEMENTED: `ContentList` - Content management interface
- ✅ IMPLEMENTED: `CollectionsTab` - Collection/course management
- ✅ IMPLEMENTED: `BookingsDashboard` - Booking management interface
- ✅ IMPLEMENTED: `PriceListManager` - Service pricing management
- ✅ IMPLEMENTED: `PayoutPage` - Payout history and management
- ✅ IMPLEMENTED: `SubscriptionModal` - Subscription checkout flow
- ✅ IMPLEMENTED: `BookingModal` - Service booking interface
- ✅ IMPLEMENTED: `PremiumAccessModal` - Premium content access

#### **Backend Components**
- ✅ IMPLEMENTED: `paystack.ts` - Payment processing integration
- ✅ IMPLEMENTED: `cloudflare/stream.ts` - Video streaming integration
- ✅ IMPLEMENTED: `cloudflare/r2.ts` - File storage integration
- ✅ IMPLEMENTED: `supabase/client.ts & server.ts` - Database and auth clients
- ✅ IMPLEMENTED: `actions/` - Server actions for business logic (creator, booking, payment, etc.)
- ✅ IMPLEMENTED: `lib/analytics.ts` - Analytics and tracking logic

#### **API Endpoints**
- ✅ IMPLEMENTED: `/api/bookings/*` - Booking management
- ✅ IMPLEMENTED: `/api/payments/*` - Payment processing
- ✅ IMPLEMENTED: `/api/subscribe` - Subscription management
- ✅ IMPLEMENTED: `/api/premium/*` - Premium access
- ✅ IMPLEMENTED: `/api/upload/*` - File upload handling
- ✅ IMPLEMENTED: `/api/analytics/*` - Analytics tracking

### 3.3 Integration Points (from imports/config)

#### **External Services**
- ✅ IMPLEMENTED: **Supabase** - Authentication, database, real-time features
- ✅ IMPLEMENTED: **Paystack** - Nigerian payment processing, bank transfers, subaccounts
- ✅ IMPLEMENTED: **Cloudflare Stream** - Video upload, streaming, and processing
- ✅ IMPLEMENTED: **Cloudflare R2** - Object storage for images and files
- ✅ IMPLEMENTED: **Sentry** - Error monitoring and reporting

#### **Database Integration**
- ✅ IMPLEMENTED: **Prisma ORM** - Type-safe database access
- ✅ IMPLEMENTED: **PostgreSQL** - Primary database via Supabase

#### **Email Integration**
- ⚠️ PARTIAL: **SMTP Service** - Email sending for notifications and access codes (configured but implementation details unclear)

## PART 8: OPEN QUESTIONS & RISKS

### 8.1 Known Unknowns (gaps I should address)

**Business Logic Gaps:**
- ❌ **Subscription Plan Changes**: How should upgrades/downgrades be handled? Proration logic?
- ❌ **Content Moderation**: What automated filtering or review processes needed?
- ❌ **Creator Verification**: How to verify creator legitimacy and prevent fraud?
- ❌ **Customer Support**: How to handle booking disputes and refunds?
- ❌ **Platform Scaling**: How to handle viral creators with thousands of subscribers?

**Technical Gaps:**
- ❌ **Performance Monitoring**: What metrics should be tracked for system health?
- ❌ **Backup Strategy**: How to backup user content and database?
- ❌ **Rate Limiting**: What limits should be set for different user types?
- ❌ **Caching Strategy**: What should be cached and for how long?

**Legal/Compliance Gaps:**
- ❌ **Content Ownership**: How to verify creators own uploaded content?
- ❌ **GDPR Compliance**: How to handle data deletion and user rights?
- ❌ **Payment Regulations**: How to handle Nigerian financial regulations?

### 8.2 Risk Register (fragile code, missing validation)

#### **High Risk - Security**
- ❌ **Race Conditions**: Concurrent operations could cause data corruption
- ❌ **Input Validation Gaps**: Missing XSS/SQL injection protection in some areas
- ❌ **Session Management**: No explicit session timeout or refresh handling
- ❌ **API Rate Limiting**: Public APIs vulnerable to abuse

#### **High Risk - Business Logic**
- ❌ **Payment Failures**: No retry logic for failed Paystack operations
- ❌ **Data Consistency**: No validation that metrics match actual transaction data
- ❌ **Subscription Edge Cases**: No handling of payment method failures or expired cards
- ❌ **Booking Conflicts**: No protection against double-bookings or scheduling conflicts

#### **Medium Risk - Performance**
- ❌ **Database Queries**: Analytics queries could be slow with large datasets
- ❌ **File Upload Limits**: No handling of large file uploads or timeouts
- ❌ **Memory Usage**: Video processing could consume excessive resources

#### **Medium Risk - Reliability**
- ❌ **Error Handling**: Inconsistent error handling across API endpoints
- ❌ **Transaction Rollbacks**: No clear transaction management for complex operations
- ❌ **Monitoring**: No alerting for failed operations or system issues

### 8.3 Assumptions (what the code assumes)

**Technical Assumptions:**
- ✅ **Supabase Reliability**: Assumes Supabase auth and database are always available
- ✅ **Paystack Integration**: Assumes Paystack APIs work as documented
- ✅ **Cloudflare Services**: Assumes Cloudflare Stream/R2 are reliable for media handling
- ✅ **Network Connectivity**: Assumes stable internet for all operations

**Business Assumptions:**
- ✅ **Nigerian Market Focus**: Code assumes all users and payments are Nigeria-based
- ✅ **Creator Legitimacy**: Assumes all creators are legitimate content creators
- ✅ **Payment Success**: Assumes Paystack payments generally succeed
- ✅ **Content Appropriateness**: Assumes uploaded content is appropriate and legal

**User Behavior Assumptions:**
- ✅ **Email Access**: Assumes users have reliable email access for verification
- ✅ **Bank Account Validity**: Assumes provided bank details are correct
- ✅ **Service Completion**: Assumes creators complete booked services
- ✅ **Payment Willingness**: Assumes fans will pay for premium content

**Operational Assumptions:**
- ✅ **Platform Usage**: Assumes moderate concurrent usage (no viral scaling)
- ✅ **Storage Limits**: Assumes Cloudflare storage limits won't be exceeded
- ✅ **Cost Management**: Assumes Paystack fees remain stable
- ✅ **Regulatory Compliance**: Assumes current payment regulations remain unchanged

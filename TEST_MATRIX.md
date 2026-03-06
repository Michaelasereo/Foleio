# Foleio Platform - Test Matrix

## **1. AUTHENTICATION & ONBOARDING**

### **1.1 Happy Path Tests**

**Test Case: Successful Creator Onboarding**
- **File Tested:** `/app/onboard/page.tsx`, `/lib/actions/creator.ts`
- **Preconditions:** New user with valid Supabase session
- **Steps:**
  1. Navigate to `/onboard` page
  2. Fill step 1: Display name, bio, category, social handles
  3. Fill step 2: Valid bank code, account number, account name
  4. Fill step 3: Plan name, price (≥₦1000), description
  5. Fill step 4: Select platform plan
  6. Submit final form
- **Expected Result:** Creator profile created, redirected to `/creator/dashboard`
- **Data Validation:** Creator record in database, User.isCreator = true

**Test Case: Username Generation**
- **File Tested:** `createCreatorProfile()` in `/lib/actions/creator.ts`
- **Preconditions:** Display name "John's Beauty Studio"
- **Steps:** Complete onboarding flow
- **Expected Result:** Username "johns-beauty-studio" created (lowercase, hyphens)
- **Edge Check:** Special characters removed, duplicates get timestamp suffix

### **1.2 Negative Tests**

**Test Case: Invalid Display Name**
- **File Tested:** `/app/onboard/page.tsx` (Zod validation)
- **Preconditions:** Empty or invalid display name
- **Input:** Display name "< 2 chars" or "> 50 chars"
- **Expected Result:** Form validation error, cannot proceed to step 2

**Test Case: Invalid Bank Details**
- **File Tested:** `step2Schema` in `/app/onboard/page.tsx`
- **Input:** Invalid account number format, non-existent bank code
- **Expected Result:** Zod validation fails, error messages displayed

**Test Case: Session Expired During Onboarding**
- **File Tested:** `createCreatorProfile()` in `/lib/actions/creator.ts`
- **Preconditions:** Supabase session expires after step 3 completion
- **Expected Result:** Error "Unauthorized", user must restart onboarding

**Test Case: Duplicate Creator Profile**
- **File Tested:** Creator layout `/app/(creator)/layout.tsx`
- **Preconditions:** User already has creator profile
- **Action:** Attempt to access `/onboard`
- **Expected Result:** Redirect to `/onboard` (missing duplicate check!)

### **1.3 Integration Tests**

**Test Case: Onboarding → Dashboard Access**
- **Files Tested:** `/app/onboard/page.tsx` → `/app/(creator)/layout.tsx`
- **Flow:** Complete onboarding → access creator dashboard
- **Expected Result:** Creator sidebar shows correct profile data

**Test Case: Onboarding → Subscription Plan Creation**
- **Files Tested:** `createCreatorProfile()` → `CreatorPlan` model
- **Flow:** Step 3 plan creation → verify in database
- **Expected Result:** CreatorPlan record created with correct pricing

## **2. CONTENT MANAGEMENT & UPLOAD**

### **2.1 Happy Path Tests**

**Test Case: Video Content Upload**
- **File Tested:** `/app/(creator)/content/new/page.tsx`, `/api/upload/stream/route.ts`
- **Preconditions:** Authenticated creator, valid MP4 file < 2GB
- **Steps:**
  1. Navigate to content creation page
  2. Select video file and fill metadata
  3. Submit form
  4. Verify upload progress and completion
- **Expected Result:** Video uploaded to Cloudflare Stream, Content record created

**Test Case: Content with Collection Linkage**
- **File Tested:** `/app/(creator)/content/new/page.tsx`, `createContent()` in `/lib/actions/content.ts`
- **Preconditions:** Creator has existing collection
- **Steps:** Create tutorial content, link to collection
- **Expected Result:** Content.collectionId set correctly

**Test Case: Access Control Settings**
- **File Tested:** Content creation form validation
- **Input:** accessType: "subscription", requiredPlanId: valid plan
- **Expected Result:** Content record with correct access controls

### **2.2 Negative Tests**

**Test Case: Invalid File Type Upload**
- **File Tested:** `/app/(creator)/content/new/page.tsx` (client validation)
- **Input:** Non-video file for video content type
- **Expected Result:** Upload rejected with clear error message

**Test Case: File Size Limit Exceeded**
- **File Tested:** `/api/upload/stream/route.ts` (no size validation)
- **Input:** File > 2GB
- **Expected Result:** Upload may succeed or fail silently (missing validation!)

**Test Case: Cloudflare Stream Outage**
- **File Tested:** `/api/upload/stream/route.ts`
- **Preconditions:** Cloudflare API returns 500 error
- **Expected Result:** Generic error returned, no retry logic

**Test Case: Content Creation Without Authentication**
- **File Tested:** `createContent()` in `/lib/actions/content.ts`
- **Preconditions:** No valid session
- **Expected Result:** Error "You must be logged in to create content"

**Test Case: Invalid Collection Linkage**
- **File Tested:** Content creation validation
- **Input:** Link tutorial to non-existent collection
- **Expected Result:** Validation allows invalid linkage (missing check!)

### **2.3 Integration Tests**

**Test Case: Upload → Content Display**
- **Files Tested:** `/api/upload/stream/route.ts` → Content list pages
- **Flow:** Upload video → verify display in content list
- **Expected Result:** Video thumbnail and metadata display correctly

**Test Case: Content → Collection Integration**
- **Files Tested:** Content creation → Collection management
- **Flow:** Create tutorial → link to collection → verify in collection view
- **Expected Result:** Tutorial appears in collection sections

## **3. SUBSCRIPTION MANAGEMENT**

### **3.1 Happy Path Tests**

**Test Case: Successful Subscription Payment**
- **File Tested:** `/api/payments/initialize/route.ts`, `/app/payment/callback/page.tsx`
- **Preconditions:** Valid creator with active plan, authenticated fan
- **Steps:**
  1. Initialize payment with valid data
  2. Complete Paystack payment
  3. Verify callback processing
- **Expected Result:** FanSubscription created, payment recorded

**Test Case: Guest Subscription (No Account Required)**
- **File Tested:** `/api/payments/initialize/route.ts`
- **Preconditions:** No user authentication required
- **Input:** Valid email, phone, creatorId, planId
- **Expected Result:** Payment initialized without session

**Test Case: Subaccount Revenue Splitting**
- **File Tested:** `/api/payments/initialize/route.ts`
- **Preconditions:** Creator has valid Paystack subaccount
- **Expected Result:** Payment created with subaccount code for splitting

### **3.2 Negative Tests**

**Test Case: Invalid Payment Amount**
- **File Tested:** `/api/payments/initialize/route.ts` (Zod validation)
- **Input:** Amount < ₦1000
- **Expected Result:** Validation error "Minimum ₦10"

**Test Case: Non-existent Creator**
- **File Tested:** `/api/payments/initialize/route.ts`
- **Input:** Invalid creatorId
- **Expected Result:** Error "Creator not found"

**Test Case: Paystack API Failure**
- **File Tested:** `/api/payments/initialize/route.ts`
- **Preconditions:** Paystack API returns error
- **Expected Result:** Generic error, no retry logic

**Test Case: Duplicate Subscription Creation**
- **File Tested:** FanSubscription unique constraint
- **Preconditions:** Fan already subscribed to creator
- **Action:** Attempt second subscription
- **Expected Result:** Database constraint violation (needs handling!)

### **3.3 Integration Tests**

**Test Case: Payment → Subscription Creation**
- **Files Tested:** `/api/payments/initialize/route.ts` → Paystack webhook → FanSubscription
- **Flow:** Initialize payment → complete on Paystack → webhook creates subscription
- **Expected Result:** FanSubscription record with correct Paystack codes

**Test Case: Subscription → Content Access**
- **Files Tested:** FanSubscription → Content access control
- **Flow:** Create subscription → attempt access to subscription content
- **Expected Result:** Content accessible via subscription

## **4. BOOKING SYSTEM**

### **4.1 Happy Path Tests**

**Test Case: Successful Service Booking**
- **File Tested:** `/api/bookings/create/route.ts`, BookingModal component
- **Preconditions:** Valid service, available date, customer details
- **Steps:**
  1. Select service and date
  2. Fill customer information
  3. Submit booking
- **Expected Result:** Booking created with tracking token, 60/40 split calculated

**Test Case: Booking Tracking Page**
- **File Tested:** `/app/tracking/[token]/page.tsx`
- **Preconditions:** Valid booking with tracking token
- **Action:** Access tracking URL
- **Expected Result:** Booking status and details displayed

**Test Case: Availability Validation**
- **File Tested:** `/api/bookings/create/route.ts`
- **Preconditions:** Service has availability restrictions
- **Input:** Valid date within availability window
- **Expected Result:** Booking accepted

### **4.2 Negative Tests**

**Test Case: Double Booking Race Condition**
- **File Tested:** `/api/bookings/create/route.ts` availability checking
- **Preconditions:** Two users attempt same time slot simultaneously
- **Expected Result:** One succeeds, one fails (race condition exists!)

**Test Case: Past Date Selection**
- **File Tested:** Booking form validation (client-side only)
- **Input:** Date in the past
- **Expected Result:** Validation allows past dates (missing server validation!)

**Test Case: Service Unavailable**
- **File Tested:** `/api/bookings/create/route.ts`
- **Input:** Inactive or non-existent priceListItem
- **Expected Result:** Error "Service not found or unavailable"

**Test Case: Invalid Customer Data**
- **File Tested:** `/api/bookings/create/route.ts` (Zod validation)
- **Input:** Invalid email format, short phone number
- **Expected Result:** Validation errors returned

**Test Case: Overbooking Max Capacity**
- **File Tested:** `/api/bookings/create/route.ts` availability logic
- **Preconditions:** Date at max capacity
- **Action:** Attempt additional booking
- **Expected Result:** Error "This date is fully booked"

### **4.3 Integration Tests**

**Test Case: Booking → Payment Integration**
- **Files Tested:** `/api/bookings/create/route.ts` → Paystack payment
- **Flow:** Create booking → complete payment → booking status updates
- **Expected Result:** Booking status changes from pending to paid

**Test Case: Booking → Creator Payout**
- **Files Tested:** Booking completion → Payout processing
- **Flow:** Service completed → 40% payout released
- **Expected Result:** Creator balance updated correctly

## **5. PAYMENT PROCESSING & PAYOUTS**

### **5.1 Happy Path Tests**

**Test Case: Successful Creator Payout**
- **File Tested:** `requestPayout()` in `/lib/actions/payment.ts`
- **Preconditions:** Creator with sufficient balance, valid subaccount
- **Steps:**
  1. Submit payout request
  2. Verify Paystack transfer initiation
  3. Check balance deduction
- **Expected Result:** Payout record created, balance updated

**Test Case: Paystack Webhook Processing**
- **File Tested:** `/api/webhooks/paystack/route.ts`
- **Preconditions:** Valid Paystack webhook payload
- **Action:** Receive transfer.success webhook
- **Expected Result:** Payout status updated to success

### **5.2 Negative Tests**

**Test Case: Insufficient Balance**
- **File Tested:** `requestPayout()` validation
- **Input:** Request amount > available balance
- **Expected Result:** Error "Insufficient balance"

**Test Case: Invalid Subaccount**
- **File Tested:** `requestPayout()` validation
- **Preconditions:** Creator missing Paystack subaccount code
- **Expected Result:** Error "Bank account not set up"

**Test Case: Concurrent Payout Requests**
- **File Tested:** `requestPayout()` balance update
- **Preconditions:** Two simultaneous payout requests
- **Expected Result:** Race condition possible (balance inconsistencies!)

**Test Case: Paystack Transfer Failure**
- **File Tested:** `/lib/actions/payment.ts` error handling
- **Preconditions:** Paystack API returns error
- **Expected Result:** Generic error, no retry logic

### **5.3 Integration Tests**

**Test Case: Payout → Bank Transfer**
- **Files Tested:** `requestPayout()` → Paystack API → Creator bank account
- **Flow:** Request payout → Paystack processes → funds in creator account
- **Expected Result:** Successful bank transfer

**Test Case: Payment → Balance Update**
- **Files Tested:** Paystack webhook → Creator balance updates
- **Flow:** Successful fan payment → webhook → creator balance +₦
- **Expected Result:** Balance accurately reflects all transactions

## **6. PREMIUM CONTENT ACCESS**

### **6.1 Happy Path Tests**

**Test Case: Email Code Generation**
- **File Tested:** `/api/premium/send-code/route.ts`
- **Preconditions:** Valid content/collection, email address
- **Action:** Request access code
- **Expected Result:** 6-digit code generated, expiration set

**Test Case: Code Verification Success**
- **File Tested:** `/api/premium/verify-code/route.ts`
- **Preconditions:** Valid unused code within 15 minutes
- **Action:** Submit correct code
- **Expected Result:** Code marked verified, cookie set, view count incremented

**Test Case: Collection Access**
- **File Tested:** Collection access logic
- **Preconditions:** Verified collection access
- **Action:** Access collection content
- **Expected Result:** All tutorials accessible

### **6.2 Negative Tests**

**Test Case: Expired Code Verification**
- **File Tested:** `/api/premium/verify-code/route.ts`
- **Preconditions:** Code older than 15 minutes
- **Action:** Attempt verification
- **Expected Result:** Error "Verification code has expired"

**Test Case: Already Used Code**
- **File Tested:** `/api/premium/verify-code/route.ts`
- **Preconditions:** Code previously verified
- **Action:** Attempt reuse
- **Expected Result:** Error "This code has already been used"

**Test Case: Invalid Code Format**
- **File Tested:** `/api/premium/verify-code/route.ts` (Zod validation)
- **Input:** Non-6-digit code
- **Expected Result:** Validation error

**Test Case: Rate Limiting Bypass**
- **File Tested:** `/api/premium/send-code/route.ts`
- **Action:** Multiple rapid requests for same email
- **Expected Result:** All requests succeed (no rate limiting!)

### **6.3 Integration Tests**

**Test Case: Code Verification → Content Access**
- **Files Tested:** `/api/premium/verify-code/route.ts` → Content access control
- **Flow:** Verify code → attempt content access
- **Expected Result:** Content accessible via cookie/session

**Test Case: Email Delivery → Code Reception**
- **Files Tested:** Code generation → Email service → User inbox
- **Flow:** Request code → email sent → user receives code
- **Expected Result:** Code delivered to correct email address

## **7. ANALYTICS & TRACKING**

### **7.1 Happy Path Tests**

**Test Case: Dashboard Data Loading**
- **File Tested:** `/lib/actions/analytics.ts`, Dashboard component
- **Preconditions:** Creator with content and subscribers
- **Action:** Load dashboard
- **Expected Result:** Metrics display correctly (views, subscribers, revenue)

**Test Case: Event Tracking**
- **File Tested:** `/api/analytics/track/route.ts`
- **Input:** Valid event data
- **Expected Result:** Event logged to console (placeholder implementation)

### **7.2 Negative Tests**

**Test Case: Analytics Query Timeout**
- **File Tested:** `/lib/actions/analytics.ts` query logic
- **Preconditions:** Large dataset causing slow queries
- **Expected Result:** Query timeout or slow loading (no optimization!)

**Test Case: Invalid Event Data**
- **File Tested:** `/api/analytics/track/route.ts`
- **Input:** Malformed JSON or invalid event structure
- **Expected Result:** Basic parsing succeeds (no validation!)

**Test Case: Creator Without Data**
- **File Tested:** Dashboard data loading
- **Preconditions:** Creator with no content/subscribers
- **Expected Result:** Dashboard shows zeros (potential division by zero?)

### **7.3 Integration Tests**

**Test Case: Content Views → Analytics**
- **Files Tested:** Content access → Analytics tracking
- **Flow:** User views content → view count incremented → dashboard updates
- **Expected Result:** Accurate view metrics in dashboard

## **8. EMAIL MARKETING & SUBSCRIPTIONS**

### **8.1 Happy Path Tests**

**Test Case: Email Subscription**
- **File Tested:** `/api/subscribe/route.ts` POST
- **Input:** Valid creatorId and email
- **Expected Result:** EmailSubscription record created

**Test Case: Email Unsubscription**
- **File Tested:** `/api/subscribe/route.ts` DELETE
- **Preconditions:** Valid unsubscribe token
- **Action:** Call DELETE with token
- **Expected Result:** Subscription marked inactive

### **8.2 Negative Tests**

**Test Case: Invalid Unsubscribe Token**
- **File Tested:** `/api/subscribe/route.ts` DELETE
- **Input:** Non-existent or malformed token
- **Expected Result:** Error "Missing unsubscribe token" (basic check only)

**Test Case: Duplicate Subscription**
- **File Tested:** EmailSubscription unique constraint
- **Preconditions:** Email already subscribed to creator
- **Action:** Attempt duplicate subscription
- **Expected Result:** Database constraint violation (unhandled!)

**Test Case: Invalid Email Format**
- **File Tested:** `/api/subscribe/route.ts` (Zod validation)
- **Input:** Invalid email address
- **Expected Result:** Validation error

### **8.3 Integration Tests**

**Test Case: Subscription → Creator Email List**
- **Files Tested:** `/api/subscribe/route.ts` → Creator email management
- **Flow:** Fan subscribes → appears in creator's subscriber list
- **Expected Result:** Subscriber count and list updated

---

## **PERFORMANCE TESTS NEEDED**

### **4.1 Load Testing**

**Test Case: Concurrent User Registrations**
- **File Tested:** `/app/onboard/page.tsx`, `/lib/actions/creator.ts`
- **Scenario:** 100 users simultaneously registering
- **Metrics:** Response time, error rate, database connection usage
- **Expected Result:** < 5 second response time, 0% errors

**Test Case: File Upload Stress Test**
- **File Tested:** `/api/upload/stream/route.ts`
- **Scenario:** 50 concurrent video uploads (500MB each)
- **Metrics:** Upload success rate, Cloudflare API limits
- **Expected Result:** All uploads complete within 10 minutes

**Test Case: Payment Processing Load**
- **File Tested:** `/api/payments/initialize/route.ts`, Paystack integration
- **Scenario:** 200 concurrent subscription payments
- **Metrics:** Payment success rate, Paystack API response time
- **Expected Result:** > 95% success rate

### **4.2 Database Performance**

**Test Case: Analytics Query Performance**
- **File Tested:** `/lib/actions/analytics.ts`
- **Scenario:** Creator with 10,000 content items, 50,000 subscribers
- **Metrics:** Query execution time, memory usage
- **Expected Result:** Dashboard loads within 3 seconds

**Test Case: Booking Availability Check**
- **File Tested:** `/api/bookings/create/route.ts`
- **Scenario:** 1,000 concurrent availability checks
- **Metrics:** Query performance, lock contention
- **Expected Result:** < 1 second response time

### **4.3 API Rate Limiting Tests**

**Test Case: Subscription Spam Protection**
- **File Tested:** `/api/payments/initialize/route.ts`
- **Scenario:** 100 requests/second to payment initialization
- **Metrics:** Error rate, server resource usage
- **Expected Result:** Proper rate limiting prevents abuse

**Test Case: Content Upload Rate Limiting**
- **File Tested:** `/api/upload/stream/route.ts`
- **Scenario:** Multiple large file uploads from single IP
- **Metrics:** Upload rejection rate, bandwidth usage
- **Expected Result:** Rate limiting prevents service disruption

### **4.4 Endurance Testing**

**Test Case: Long-Running Session**
- **File Tested:** All authenticated endpoints
- **Scenario:** User session active for 24+ hours
- **Metrics:** Session validity, token refresh success
- **Expected Result:** Seamless session continuation

**Test Case: Large Dataset Handling**
- **File Tested:** Content list, subscription list, analytics
- **Scenario:** Creator with 100,000 subscribers, 10,000 content items
- **Metrics:** Page load time, pagination performance
- **Expected Result:** Acceptable performance with pagination

---

## **TEST EXECUTION PRIORITIES**

### **🔴 CRITICAL (Pre-Production)**
1. **Payment atomicity tests** - Ensure no money lost in failures
2. **Race condition tests** - Booking conflicts, balance updates
3. **Authentication security** - Session handling, authorization
4. **Data integrity** - Database constraints, foreign keys

### **🟡 HIGH (Production Readiness)**
1. **Error handling coverage** - All negative test cases
2. **Performance baselines** - Load testing for expected usage
3. **Integration flows** - End-to-end user journeys
4. **Security testing** - Input validation, XSS prevention

### **🟢 MEDIUM (Post-Launch)**
1. **Edge case coverage** - Unusual user behaviors
2. **Scalability testing** - Performance under growth
3. **Monitoring validation** - Alert system effectiveness
4. **Accessibility testing** - Screen reader, keyboard navigation

### **🔵 LOW (Future Releases)**
1. **Multi-browser testing** - Edge cases, compatibility
2. **Mobile device testing** - Touch interactions, responsive design
3. **Internationalization** - Multi-language, currency support
4. **A/B testing framework** - Feature flag validation

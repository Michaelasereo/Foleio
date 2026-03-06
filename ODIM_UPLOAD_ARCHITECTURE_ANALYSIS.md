# 🏗️ FOLEIO PLATFORM - UPLOAD ARCHITECTURE ANALYSIS
## Senior Software Architect Review (30 Years Experience)

**Date:** January 8, 2026  
**Platform:** Foleio Creator Platform  
**Framework:** Next.js 16 (App Router), TypeScript 5.x  
**Reviewer:** Senior Software Architect

---

## 📋 EXECUTIVE SUMMARY

Your Foleio platform implements a **hybrid storage architecture** with:
- **Supabase Storage** for images (avatars, banners, content images)
- **Mux** for video uploads and streaming
- **Cloudflare R2** (legacy/fallback, partially implemented)

**Overall Assessment:** ⚠️ **ARCHITECTURAL INCONSISTENCY DETECTED**

The platform has **multiple overlapping upload implementations** that need consolidation. While functional, the architecture shows signs of iterative development without full cleanup of legacy code.

---

## 1️⃣ CURRENT STORAGE SOLUTIONS

### ✅ **ACTIVE IMPLEMENTATIONS**

#### **A. Supabase Storage (Primary for Images)**
- **Status:** ✅ **ACTIVE & CONFIGURED**
- **Bucket Name:** `crealio`
- **Usage:** Profile images, banners, general image content
- **Implementation:** `apps/web/lib/storage/upload-service.ts`
- **API Endpoint:** `/api/upload/profile`
- **Environment Variables:**
  - `NEXT_PUBLIC_SUPABASE_URL` ✅
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
  - `SUPABASE_SERVICE_ROLE_KEY` ✅

**Key Features:**
- Direct upload to Supabase Storage
- Automatic file path generation: `{type}s/{userId}/{timestamp}-{random}.{ext}`
- Public URL generation
- Fallback to placeholder on failure

**Code Location:**
```typescript
// apps/web/lib/storage/upload-service.ts (lines 59-142)
private static async uploadImageToSupabase(...)
```

---

#### **B. Mux (Primary for Videos)**
- **Status:** ✅ **ACTIVE & CONFIGURED**
- **Usage:** Video uploads, streaming, transcoding
- **Implementation:** `apps/web/app/api/upload/stream/route.ts`
- **Environment Variables:**
  - `MUX_TOKEN_ID` ✅
  - `MUX_TOKEN_SECRET` ✅

**Key Features:**
- Direct upload to Mux via signed URLs
- Automatic asset creation
- HLS streaming support
- Playback ID generation
- Database tracking with `muxAssetId` and `muxPlaybackId`

**Code Location:**
```typescript
// apps/web/app/api/upload/stream/route.ts (lines 120-194)
// Direct Mux API integration
```

---

#### **C. Cloudflare R2 (Legacy/Fallback)**
- **Status:** ⚠️ **PARTIALLY IMPLEMENTED**
- **Usage:** Intended for images (superseded by Supabase)
- **Implementation:** `apps/web/app/api/upload/r2/route.ts`
- **Environment Variables:**
  - `CLOUDFLARE_ACCOUNT_ID` ⚠️ (may not be set)
  - `CLOUDFLARE_R2_ACCESS_KEY_ID` ⚠️
  - `CLOUDFLARE_R2_SECRET_ACCESS_KEY` ⚠️
  - `CLOUDFLARE_R2_BUCKET_NAME` ⚠️
  - `CLOUDFLARE_R2_PUBLIC_URL` ⚠️

**Key Features:**
- Enterprise-grade security validation
- Rate limiting
- Cost monitoring
- Quota management
- Upload gateway with failover

**Issue:** This endpoint is **over-engineered** for current needs and conflicts with Supabase Storage implementation.

---

## 2️⃣ UPLOAD API ENDPOINTS

### **Endpoint 1: `/api/upload/profile`**
- **Purpose:** Profile and banner image uploads
- **Method:** `POST`
- **Status:** ✅ **ACTIVE**
- **Storage:** Supabase Storage (`crealio` bucket)
- **File Types:** `avatar`, `banner`
- **Max Size:** 5MB (avatar), 20MB (banner)
- **Authentication:** Supabase Auth (required)
- **Implementation:** `apps/web/app/api/upload/profile/route.ts`

**Flow:**
1. Authenticate user via Supabase
2. Get/create creator record
3. Validate file (type, size)
4. Upload via `UploadService.upload()` → Supabase Storage
5. Update creator record with new URL

**Issues:**
- ⚠️ **Line 15-19:** References undefined R2 variables (dead code)
- ⚠️ **Line 114:** Image optimization disabled (`optimizeImages: false`)
- ⚠️ **Missing:** `randomUUID()` import (line 99)

---

### **Endpoint 2: `/api/upload/stream`**
- **Purpose:** Video uploads
- **Method:** `POST`
- **Status:** ✅ **ACTIVE**
- **Storage:** Mux
- **File Types:** `video/mp4`, `video/webm`, `video/quicktime`, `video/x-matroska`
- **Max Size:** 100MB (hardcoded, should be configurable)
- **Authentication:** Supabase Auth (required)
- **Implementation:** `apps/web/app/api/upload/stream/route.ts`

**Flow:**
1. Authenticate user
2. Get/create creator
3. Validate file (type, size)
4. Create upload record in database (`status: 'UPLOADING'`)
5. Create Mux direct upload URL
6. Upload file to Mux
7. Update database with Mux asset/playback IDs
8. Create content record

**Issues:**
- ⚠️ **Line 71:** Missing closing brace (syntax error)
- ⚠️ **Hardcoded limits:** Should use environment variables
- ✅ **Good:** Proper enum usage (`UPLOADING`, `COMPLETED`, `FAILED`)

---

### **Endpoint 3: `/api/upload/r2`**
- **Purpose:** General image uploads (legacy)
- **Method:** `POST`, `DELETE`
- **Status:** ⚠️ **LEGACY (CONFLICTS WITH SUPABASE)**
- **Storage:** Cloudflare R2
- **Implementation:** `apps/web/app/api/upload/r2/route.ts`

**Flow:**
1. Rate limiting
2. Security validation (`uploadSecurity.validateFile()`)
3. Quota checking (`costMonitor.checkUserQuota()`)
4. Cost estimation and deduction
5. Upload via `uploadGateway.upload()` → R2
6. Queue for processing

**Issues:**
- ⚠️ **Over-engineered:** Complex middleware for simple image uploads
- ⚠️ **Conflicts:** Supabase Storage is now primary for images
- ⚠️ **Dependencies:** Requires Redis, BullMQ (may not be configured)
- ⚠️ **Unused:** `CloudflareR2Processor` in upload gateway

**Recommendation:** **DEPRECATE** or **REFACTOR** to use Supabase Storage

---

## 3️⃣ UPLOAD SERVICES & UTILITIES

### **A. UploadService (`apps/web/lib/storage/upload-service.ts`)**
- **Status:** ✅ **ACTIVE (PRIMARY SERVICE)**
- **Purpose:** Unified upload service for all file types
- **Storage Routing:**
  - Videos → Mux
  - Images → Supabase Storage

**Key Methods:**
- `upload(options: UploadOptions): Promise<UploadResult>`
- `uploadImageToSupabase()` (private)
- `uploadVideoToMux()` (private - **PLACEHOLDER**)
- `validateFile()`
- `getAllowedTypes()`

**Issues:**
- ⚠️ **Line 147-177:** `uploadVideoToMux()` is a **PLACEHOLDER** (returns placeholder URL)
- ⚠️ **Line 182-193:** References `getR2Client()` which doesn't exist
- ⚠️ **Missing:** Image optimization (Sharp not installed)
- ⚠️ **Missing:** File type validation (magic numbers)

---

### **B. UploadManager (`apps/web/lib/services/upload-manager.ts`)**
- **Status:** ⚠️ **PARTIALLY IMPLEMENTED**
- **Purpose:** High-level video upload orchestration
- **Features:**
  - File validation
  - Mux integration with polling
  - Database record management
  - Content creation

**Issues:**
- ⚠️ **Line 32:** Uses incorrect enum value `'uploading'` (should be `'UPLOADING'`)
- ⚠️ **Line 48:** Uses incorrect enum value `'completed'` (should be `'COMPLETED'`)
- ⚠️ **Line 89:** Uses incorrect enum value `'failed'` (should be `'FAILED'`)
- ⚠️ **Line 62:** References `price` field (doesn't exist in schema)
- ⚠️ **Not used:** This service is not called by any API endpoint

**Recommendation:** **FIX ENUM VALUES** or **DEPRECATE** if unused

---

### **C. UploadGateway (`apps/web/lib/upload/upload-gateway.ts`)**
- **Status:** ⚠️ **OVER-ENGINEERED FOR CURRENT NEEDS**
- **Purpose:** Provider abstraction with failover
- **Processors:**
  - `MuxProcessor` (videos)
  - `CloudflareR2Processor` (images - **UNUSED**)
  - `AWSMediaConvertProcessor` (placeholder)
  - `CloudflareStreamProcessor` (placeholder)

**Issues:**
- ⚠️ **Unused:** Only called by `/api/upload/r2` (legacy endpoint)
- ⚠️ **Complexity:** Failover logic not needed for current scale
- ⚠️ **R2 Processor:** Calls `/api/upload/r2` (circular dependency risk)

**Recommendation:** **SIMPLIFY** or **DEPRECATE** until needed

---

### **D. SecureUploadHandler (`apps/web/lib/security/upload-security.ts`)**
- **Status:** ✅ **WELL-IMPLEMENTED**
- **Purpose:** Comprehensive file validation and security
- **Features:**
  - Magic number validation
  - File type validation
  - Size limits (plan-based)
  - Security threat detection
  - Content validation hooks

**Issues:**
- ⚠️ **Not used:** Only called by `/api/upload/r2` (legacy)
- ⚠️ **Missing:** Integration with Supabase upload flow

**Recommendation:** **INTEGRATE** into `UploadService`

---

## 4️⃣ DEPENDENCIES ANALYSIS

### **✅ INSTALLED & WORKING**
- `@supabase/supabase-js` ✅ (v2.47.10)
- `@supabase/ssr` ✅ (v0.5.2)
- `@aws-sdk/client-s3` ✅ (v3.700.0) - For R2
- `bullmq` ✅ (v5.12.14) - Queue system
- `ioredis` ✅ (v5.4.1) - Redis client

### **❌ MISSING CRITICAL DEPENDENCIES**
- `sharp` ❌ - **REQUIRED** for image optimization
- `file-type` ❌ - **REQUIRED** for magic number validation
- `@mux/mux-node` ❌ - **OPTIONAL** (currently using direct API calls)

### **⚠️ POTENTIALLY UNUSED**
- `bullmq` - Queue system (may not be configured)
- `ioredis` - Redis client (may not be configured)

---

## 5️⃣ ENVIRONMENT VARIABLES

### **✅ REQUIRED & CONFIGURED**
```bash
# Supabase (Primary)
NEXT_PUBLIC_SUPABASE_URL ✅
NEXT_PUBLIC_SUPABASE_ANON_KEY ✅
SUPABASE_SERVICE_ROLE_KEY ✅

# Mux (Videos)
MUX_TOKEN_ID ✅
MUX_TOKEN_SECRET ✅

# Database
DATABASE_URL ✅
```

### **⚠️ OPTIONAL / LEGACY**
```bash
# Cloudflare R2 (Legacy)
CLOUDFLARE_ACCOUNT_ID ⚠️
CLOUDFLARE_R2_ACCESS_KEY_ID ⚠️
CLOUDFLARE_R2_SECRET_ACCESS_KEY ⚠️
CLOUDFLARE_R2_BUCKET_NAME ⚠️
CLOUDFLARE_R2_PUBLIC_URL ⚠️

# Redis (Optional)
REDIS_URL ⚠️

# Monitoring
SENTRY_DSN ⚠️
```

---

## 6️⃣ FRONTEND INTEGRATION

### **A. Settings Form (`apps/web/components/creator/SettingsForm.tsx`)**
- **Status:** ✅ **WORKING**
- **Upload Endpoint:** `/api/upload/profile`
- **File Types:** Avatar, Banner
- **Validation:** Client-side (type, size)

**Flow:**
1. User selects file
2. Client-side validation (type, size)
3. Upload to `/api/upload/profile`
4. Update form state with new URL
5. Save profile on form submit

**Issues:**
- ⚠️ **Line 85:** Missing `type` parameter in FormData (should be `'avatar'` or `'banner'`)
- ✅ **Good:** Proper error handling and user feedback

---

### **B. Content Creation (`apps/web/app/(creator)/content/new/page.tsx`)**
- **Status:** ✅ **WORKING**
- **Upload Endpoints:**
  - Videos → `/api/upload/stream`
  - Images → `/api/upload/r2` (⚠️ **SHOULD USE SUPABASE**)

**Issues:**
- ⚠️ **Line 115:** Images route to `/api/upload/r2` (legacy)
- ⚠️ **Should use:** Supabase Storage for images

---

## 7️⃣ DATABASE SCHEMA

### **Upload Model (`prisma/schema.prisma`)**
```prisma
model Upload {
  id            String       @id @default(uuid())
  userId        String
  creatorId     String
  filename      String
  mimeType      String
  size          BigInt
  status        UploadStatus
  url           String?
  muxAssetId    String?
  muxPlaybackId String?
  error         String?
  metadata      Json?
  createdAt     DateTime     @default(now())
  completedAt   DateTime?
  failedAt      DateTime?
}
```

**Status:** ✅ **WELL-DESIGNED**

**Enum Values:**
- `UPLOADING` ✅
- `COMPLETED` ✅
- `FAILED` ✅

---

## 8️⃣ CRITICAL ISSUES & RECOMMENDATIONS

### **🔴 CRITICAL (Fix Immediately)**

1. **Missing `type` Parameter in Profile Upload**
   - **File:** `apps/web/components/creator/SettingsForm.tsx:85`
   - **Issue:** FormData missing `type` field
   - **Fix:** Add `formData.append('type', 'avatar')` or `'banner'`

2. **Dead Code in Profile Upload API**
   - **File:** `apps/web/app/api/upload/profile/route.ts:15-19`
   - **Issue:** References undefined R2 variables
   - **Fix:** Remove dead code

3. **Missing `randomUUID()` Import**
   - **File:** `apps/web/app/api/upload/profile/route.ts:99`
   - **Issue:** `randomUUID()` used but not imported
   - **Fix:** Add `import { randomUUID } from 'crypto'`

4. **Syntax Error in Stream Upload**
   - **File:** `apps/web/app/api/upload/stream/route.ts:71`
   - **Issue:** Missing closing brace
   - **Fix:** Add closing brace

5. **Incorrect Enum Values in UploadManager**
   - **File:** `apps/web/lib/services/upload-manager.ts`
   - **Issue:** Uses lowercase enum values (`'uploading'` vs `'UPLOADING'`)
   - **Fix:** Update to correct enum values

---

### **🟡 HIGH PRIORITY (Fix Soon)**

6. **Image Optimization Disabled**
   - **Issue:** `optimizeImages: false` in profile upload
   - **Fix:** Install `sharp` and enable optimization

7. **Video Upload Service is Placeholder**
   - **File:** `apps/web/lib/storage/upload-service.ts:147-177`
   - **Issue:** `uploadVideoToMux()` returns placeholder URL
   - **Fix:** Implement actual Mux upload (or remove if unused)

8. **Content Creation Uses Legacy R2 Endpoint**
   - **File:** `apps/web/app/(creator)/content/new/page.tsx:115`
   - **Issue:** Images route to `/api/upload/r2` instead of Supabase
   - **Fix:** Update to use `/api/upload/profile` or new Supabase endpoint

9. **Missing Image Optimization Dependencies**
   - **Issue:** `sharp` and `file-type` not installed
   - **Fix:** `npm install sharp file-type`

---

### **🟢 MEDIUM PRIORITY (Technical Debt)**

10. **Consolidate Upload Endpoints**
    - **Issue:** Multiple overlapping implementations
    - **Recommendation:**
      - Keep `/api/upload/profile` (Supabase)
      - Keep `/api/upload/stream` (Mux)
      - **Deprecate** `/api/upload/r2` (or refactor to Supabase)

11. **Simplify UploadGateway**
    - **Issue:** Over-engineered for current needs
    - **Recommendation:** Simplify or remove until needed

12. **Integrate Security Handler**
    - **Issue:** `SecureUploadHandler` only used by legacy R2 endpoint
    - **Recommendation:** Integrate into `UploadService`

13. **Fix UploadManager**
    - **Issue:** Incorrect enum values, unused
    - **Recommendation:** Fix or deprecate

---

## 9️⃣ ARCHITECTURAL RECOMMENDATIONS

### **IMMEDIATE ACTIONS (This Week)**

1. **Fix Critical Bugs** (Issues #1-5)
2. **Install Missing Dependencies** (`sharp`, `file-type`)
3. **Enable Image Optimization**
4. **Update Content Creation** to use Supabase

### **SHORT-TERM (This Month)**

5. **Consolidate Upload Architecture**
   - Single service for images (Supabase)
   - Single service for videos (Mux)
   - Remove legacy R2 code

6. **Standardize Error Handling**
   - Consistent error responses
   - Proper HTTP status codes
   - User-friendly error messages

7. **Add Comprehensive Testing**
   - Unit tests for upload services
   - Integration tests for API endpoints
   - E2E tests for upload flows

### **LONG-TERM (Next Quarter)**

8. **Implement Chunked Uploads**
   - For large files (>100MB)
   - Resume capability
   - Progress tracking

9. **Add Content Moderation**
   - Image content analysis
   - Video content analysis
   - NSFW detection

10. **Implement CDN Integration**
    - Supabase CDN for images
    - Mux CDN for videos
    - Cache optimization

---

## 🔟 FINAL ASSESSMENT

### **✅ STRENGTHS**
- ✅ Hybrid storage architecture (Supabase + Mux)
- ✅ Proper authentication and authorization
- ✅ Database tracking of uploads
- ✅ Security validation framework
- ✅ Rate limiting infrastructure

### **⚠️ WEAKNESSES**
- ⚠️ Multiple overlapping implementations
- ⚠️ Legacy code not cleaned up
- ⚠️ Missing critical dependencies
- ⚠️ Inconsistent error handling
- ⚠️ Over-engineered components

### **📊 OVERALL SCORE: 7/10**

**Platform is functional but needs architectural cleanup and bug fixes.**

---

## 📝 ACTION ITEMS CHECKLIST

- [ ] Fix missing `type` parameter in SettingsForm
- [ ] Remove dead R2 code from profile upload API
- [ ] Add `randomUUID()` import
- [ ] Fix syntax error in stream upload
- [ ] Fix enum values in UploadManager
- [ ] Install `sharp` and `file-type`
- [ ] Enable image optimization
- [ ] Update content creation to use Supabase
- [ ] Deprecate or refactor `/api/upload/r2`
- [ ] Integrate security handler into UploadService
- [ ] Add comprehensive error handling
- [ ] Write unit tests for upload services
- [ ] Document upload architecture

---

**Report Generated:** January 8, 2026  
**Next Review:** After critical fixes implemented


# Foleio Platform - Setup Guide

## Prerequisites

- Node.js 20+ installed
- npm 10+ installed
- Supabase account and project
- Paystack account (test mode for development)
- Cloudflare account (for R2 and Stream)

## Step 1: Environment Variables

### 1.1 Supabase Setup

Your Supabase credentials are already configured:
- Project URL: `https://xdwocaugiyjtbbzwpbid.supabase.co`
- Anon Key: (see ENV_VARS.md)
- Service Role Key: (see ENV_VARS.md)

**Database Connection String:**
```env
DATABASE_URL=postgresql://postgres:Adenike2026#@db.xdwocaugiyjtbbzwpbid.supabase.co:5432/postgres
```

⚠️ **Security Note:** This contains your database password. Keep it secure and never commit it to version control.

### 1.2 Configure Environment Variables

Create `apps/web/.env.local` with all your credentials:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Foleio

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xdwocaugiyjtbbzwpbid.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhkd29jYXVnaXlqdGJiendwYmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0Mzg5MDQsImV4cCI6MjA4MzAxNDkwNH0.Zb-cxxUHzATEQ0ql_6sfhBM_0u4FeyZg04RuSeC7rqU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhkd29jYXVnaXlqdGJiendwYmlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzODkwNCwiZXhwIjoyMDgzMDE0OTA0fQ.8LY924Gg8tYmC-AvDNcOraxIpOdkEHD5nKkywfFrn-I
DATABASE_URL=postgresql://postgres:Adenike2026#@db.xdwocaugiyjtbbzwpbid.supabase.co:5432/postgres

# Paystack
PAYSTACK_SECRET_KEY=your_paystack_secret_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret
# Fallback platform fee % (default 3.5). Prefer plan-based fees in app.
FOLEIO_PLATFORM_FEE_PERCENT=3.5

# Resend
RESEND_API_KEY=re_66rgwPZ1_93xPfReWa1KdYMGD5ckW7QVY
RESEND_FROM_EMAIL=noreply@foleio.ng
```

Create `packages/database/.env`:
```env
DATABASE_URL=postgresql://postgres:Adenike2026#@db.xdwocaugiyjtbbzwpbid.supabase.co:5432/postgres
```

### 1.3 Paystack Setup

Configure your Paystack API keys:
```env
PAYSTACK_SECRET_KEY=your_paystack_secret_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret
# Fallback % only when plan fee sync is unavailable (prefer plan-based fees in app)
FOLEIO_PLATFORM_FEE_PERCENT=3.5
# Platform plans (create in Paystack Dashboard → Plans, NGN):
PAYSTACK_PRO_MONTHLY_PLAN_CODE=PLN_xxxxxxxx    # ₦3,000 / month
PAYSTACK_PRO_QUARTERLY_PLAN_CODE=PLN_xxxxxxxx  # ₦7,500 / quarter
# Optional legacy monthly Pro alias during cutover:
# PAYSTACK_PRO_PLAN_CODE=PLN_xxxxxxxx
```****

**Foleio platform plans (Paystack Dashboard):**
1. Payments → Plans → Create plan (currency NGN) for each row below
2. Pro monthly: amount `300000` (₦3,000), interval monthly
3. Pro quarterly: amount `750000` (₦7,500), interval quarterly (every 3 months)
4. Copy each plan code into the matching env var
5. App fees: Free **3.5% + ₦100**, Pro **1.8% + ₦100** (legacy monthly Pro at ₦10,000 stays **0%** until period end). Paystack subaccount `percentage_charge` syncs the % portion; the flat ₦100 is applied in Foleio fee math on charged transactions.
6. Cancel stores/uses each subscription’s Paystack `email_token` in the database (no shared disable token required)
****
**Webhook Setup (for production):**
1. Go to https://dashboard.paystack.com/#/settings/developer
2. Set up a webhook URL: `https://your-domain.com/api/webhooks/paystack` (events: `charge.success`, subscription create/disable/enable)
3. Copy the webhook secret and add it to `PAYSTACK_WEBHOOK_SECRET`
4. Ensure your Paystack business is activated for live subaccount settlements (ops / Phase 1)

For local development, you can use ngrok to expose your local server for webhook testing.

### 1.3 Admin console auth

Admin login uses email/password + Google Authenticator (TOTP), not the raw `ADMIN_SECRET` as a password.

Add to `apps/web/.env.local`:

```env
# Still used as a fallback signing/encryption secret if the dedicated keys below are unset
ADMIN_SECRET=a_long_random_string
# Preferred session signing key for admin_session / admin_pre_2fa cookies
ADMIN_SESSION_SECRET=another_long_random_string
# Preferred AES key for encrypting TOTP secrets at rest
ADMIN_TOTP_ENCRYPTION_KEY=yet_another_long_random_string
ADMIN_NOTIFICATION_EMAIL=you@example.com
```

On first boot the app seeds `michaelasereo@gmail.com` / `password123` with `passwordMustChange=true`. Local only — change the password (and set up Authenticator) on first login. Never ship that seed password to production users as a permanent credential.

### 1.4 Dojah KYC (identity unlock)

Creators unlock client booking in two steps: **(1) Dojah identity KYC**, then **(2) bank account** (Paystack subaccount/recipient). The public profile shows services anytime, but **Book** only appears when both pass (`bvnVerified` + active Paystack subaccount).

Add to `apps/web/.env.local`:

```env
# Dojah — https://docs.dojah.io/docs/technical-reference/authentication
# Dashboard: create an App, then copy App ID, public key, and secret key.
NEXT_PUBLIC_DOJAH_APP_ID=your_dojah_app_id
NEXT_PUBLIC_DOJAH_PUBLIC_KEY=your_dojah_public_key
DOJAH_APP_ID=your_dojah_app_id
DOJAH_SECRET_KEY=your_dojah_secret_key
# Widget ID from EasyOnboard: https://app.dojah.io/easy-onboard
NEXT_PUBLIC_DOJAH_WIDGET_ID=your_easyonboard_widget_id
# Optional override (defaults: sandbox.dojah.io in non-prod, api.dojah.io in production)
# DOJAH_BASE_URL=https://sandbox.dojah.io
```

**Dashboard setup (follow Dojah docs):**
1. Create an App under Developers → Configuration → My Apps.
2. Create/publish an EasyOnboard flow and copy the **widget_id**.
3. Subscribe a webhook for service **KYC Widget** to `https://your-domain.com/api/webhooks/dojah`.
4. Frontend uses the JS library (`https://widget.dojah.io/widget.js`) with `app_id`, `p_key`, and `config.widget_id` + `config.webhook: true`.
5. After the widget finishes, the app confirms via `GET /api/v1/kyc/verification?reference_id=…` with headers `AppId` and `Authorization` (secret key, not Bearer). Do not trust SDK `onSuccess` alone.

### 1.5 Resend Email Setup

Your Resend API key:
```env
RESEND_API_KEY=re_66rgwPZ1_93xPfReWa1KdYMGD5ckW7QVY
RESEND_FROM_EMAIL=noreply@foleio.ng
```

Add this to `apps/web/.env.local`.

**Signup verification (OTP via Resend, not Supabase templates):**

1. Keep Resend API key in `.env.local` (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`).
2. Set `RESEND_SEND_IN_DEV=true` for local testing.
3. Signup creates the user with the Supabase **admin** API (`email_confirm: false`) and emails a 6-digit code with Resend — Supabase Auth email templates are not used.
4. In Supabase **Authentication → Providers → Email**, you can leave “Confirm email” enabled (users stay blocked until our OTP confirms them). Optional: turn off Supabase SMTP if you no longer need password-reset emails from Supabase.
5. Foleio’s signup/login UI asks for the Resend code after sign-up (or when email is still unverified).

Password reset can still use Supabase’s link template (`{{ .ConfirmationURL }}`) pointing at `/reset-password` if SMTP remains configured.

### 1.6 Cloudflare Setup (Optional for development)

For file uploads and video hosting:
```env
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-key
CLOUDFLARE_R2_BUCKET_NAME=foleio-uploads
NEXT_PUBLIC_CLOUDFLARE_STREAM_URL=your-stream-url
```

## Step 2: Database Setup

### 2.1 Generate Prisma Client

```bash
cd packages/database
npm run db:generate
```

### 2.2 Run Database Migrations

**Option A: Push schema directly (for development)**
```bash
npm run db:push
```

**Option B: Create migration (for production)**
```bash
npm run db:migrate
```

This will:
- Create all tables in your Supabase database
- Set up relationships and indexes
- Configure the database schema

### 2.3 (Optional) Open Prisma Studio

To view and manage your database:
```bash
npm run db:studio
```

## Step 3: Start Development Server

From the root directory:

```bash
npm run dev
```

This will start:
- Next.js dev server on http://localhost:3000
- All Turborepo packages in watch mode

## Step 4: Verify Setup

1. Open http://localhost:3000
2. Try signing up a new account
3. Complete the creator onboarding flow
4. Check that data is being saved to Supabase

## Troubleshooting

### Database Connection Issues

- Verify your `DATABASE_URL` is correct
- Check that your Supabase project is active
- Ensure your IP is allowed in Supabase network settings

### Paystack Webhook Issues

- Use ngrok or similar tool to expose localhost for webhook testing
- Set webhook URL in Paystack dashboard: `https://your-ngrok-url/api/webhooks/paystack`

### Dojah KYC Webhook Issues

- Subscribe service **KYC Widget** to `https://your-domain.com/api/webhooks/dojah` (use ngrok locally)
- Confirm `DOJAH_SECRET_KEY` + App ID are set so `/api/creator/kyc/confirm` can call Get Verification Details
- Widget needs `NEXT_PUBLIC_DOJAH_WIDGET_ID` from EasyOnboard; set `config.webhook: true` (already done in app code)

### Build Errors

- Clear `.next` folder: `rm -rf apps/web/.next`
- Clear node_modules: `rm -rf node_modules apps/*/node_modules packages/*/node_modules`
- Reinstall: `npm install --legacy-peer-deps`

## Next Steps

- Set up Supabase Row Level Security (RLS) policies
- Configure email templates in Supabase
- Set up production environment variables
- Configure Netlify deployment
- Set up monitoring (Sentry, Plausible)

## Development Commands

```bash
# Start dev server
npm run dev

# Run linting
npm run lint

# Run tests
npm run test

# Run E2E tests
cd apps/web && npm run test:e2e

# Format code
npm run format

# Type check
npm run type-check

# Build for production
npm run build
```

## Project Structure

```
foleio-platform/
├── apps/
│   └── web/              # Next.js 16 application
├── packages/
│   ├── ui/              # Shared UI components
│   ├── database/         # Prisma schema & Supabase client
│   └── utils/            # Shared utilities
└── netlify/              # Netlify functions
```

## Support

For issues or questions, refer to:
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Paystack Documentation](https://paystack.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)


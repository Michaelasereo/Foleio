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
```

**Webhook Setup (for production):**
1. Go to https://dashboard.paystack.com/#/settings/developer
2. Set up a webhook URL: `https://your-domain.com/api/webhooks/paystack`
3. Copy the webhook secret and add it to `PAYSTACK_WEBHOOK_SECRET`

For local development, you can use ngrok to expose your local server for webhook testing.

### 1.4 Resend Email Setup

Your Resend API key:
```env
RESEND_API_KEY=re_66rgwPZ1_93xPfReWa1KdYMGD5ckW7QVY
RESEND_FROM_EMAIL=noreply@foleio.ng
```

Add this to `apps/web/.env.local`.

### 1.5 Cloudflare Setup (Optional for development)

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


# Environment Variables Quick Reference

## Supabase Credentials

Your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xdwocaugiyjtbbzwpbid.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhkd29jYXVnaXlqdGJiendwYmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0Mzg5MDQsImV4cCI6MjA4MzAxNDkwNH0.Zb-cxxUHzATEQ0ql_6sfhBM_0u4FeyZg04RuSeC7rqU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhkd29jYXVnaXlqdGJiendwYmlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQzODkwNCwiZXhwIjoyMDgzMDE0OTA0fQ.8LY924Gg8tYmC-AvDNcOraxIpOdkEHD5nKkywfFrn-I
```

**Database Connection String:**
```env
DATABASE_URL=postgresql://postgres:Adenike2026#@db.xdwocaugiyjtbbzwpbid.supabase.co:5432/postgres
```

⚠️ **Security Note:** This contains your database password. Keep it secure and never commit it to version control. The `.env.local` and `.env` files are already in `.gitignore`.

## Resend API Key

Your Resend API key:
```env
RESEND_API_KEY=re_66rgwPZ1_93xPfReWa1KdYMGD5ckW7QVY
RESEND_FROM_EMAIL=noreply@foleio.ng
```

## Paystack Credentials

Your Paystack API keys:
```env
PAYSTACK_SECRET_KEY=your_paystack_secret_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret
# Platform fee kept on booking/subaccount split charges (Paystack percentage_charge). Default: 5
FOLEIO_PLATFORM_FEE_PERCENT=5
```

**Webhook:** subscribe to `charge.success` at `https://your-domain.com/api/webhooks/paystack`.

**Ops note:** Paystack business activation (Phase 1) is required for live subaccount settlements — configure in the Paystack dashboard; no app code.

**Note:** You'll need to set up a webhook secret in your Paystack dashboard for production. For development, you can use a placeholder or generate one.

## Quick Setup Checklist

1. ✅ Supabase URL and Keys - Provided above
2. ✅ Database Connection String - Provided above
3. ✅ Resend API Key - Provided above
4. ✅ Paystack Keys - Provided above
5. ⏳ Paystack Webhook Secret - Set up in Paystack dashboard (for webhooks)
6. ⏳ Cloudflare credentials - Get from https://cloudflare.com (optional for dev)

## ✅ Ready to Set Up Database!

All required credentials are now available. You can proceed with:
1. Creating your `.env.local` files
2. Running database migrations
3. Starting the development server

## Environment Files to Create

1. **apps/web/.env.local** - Main application environment variables
2. **packages/database/.env** - Database connection string

Copy from `.env.example` files and fill in your values.


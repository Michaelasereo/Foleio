# Push Environment Variables to Netlify

## Option 1: Using the Script (Recommended)

### Step 1: Link Your Netlify Site

First, navigate to the web app directory and link your site:

```bash
cd apps/web
npx netlify-cli link
```

When prompted, select your site from the list. If you don't have a site yet, create one first in the Netlify dashboard.

### Step 2: Run the Script

From the root directory:

```bash
./scripts/set-netlify-env.sh
```

Or from `apps/web`:

```bash
node ../../scripts/push-env-to-netlify.js
```

## Option 2: Manual Setup via Netlify Dashboard

1. Go to https://app.netlify.com
2. Select your site
3. Go to **Site configuration** → **Environment variables**
4. Add each variable from `apps/web/.env.local`

## Option 3: Using Netlify CLI Commands

If your site is already linked, you can set variables individually:

```bash
cd apps/web

# Set each variable (replace with actual values)
npx netlify-cli env:set NEXT_PUBLIC_APP_URL "https://foleio.ng"
npx netlify-cli env:set NEXT_PUBLIC_SUPABASE_URL "https://xdwocaugiyjtbbzwpbid.supabase.co"
npx netlify-cli env:set SUPABASE_SERVICE_ROLE_KEY "your-key"
# ... and so on for all variables
```

## Option 4: Bulk Import via Netlify API

If you have a Netlify access token, you can use the API directly. See the script `push-env-to-netlify.js` for an example.

## Verify

After setting variables, verify they're set:

```bash
npx netlify-cli env:list
```

## Important Notes

- Update `NEXT_PUBLIC_APP_URL` to your production URL (e.g., `https://foleio.ng`)
- Don't set placeholder values (values containing "your-")
- Some variables like `PAYSTACK_WEBHOOK_SECRET` need to be set in the Netlify dashboard
- Cloudflare credentials should be set if you're using R2/Stream


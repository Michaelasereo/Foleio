/**
 * Environment validation with fail-fast approach
 * Ensures all required environment variables are present before startup
 */

interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

export function validateEnvironment(): EnvValidationResult {
  const required = [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
    'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
    'PAYSTACK_SECRET_KEY',
    'MUX_TOKEN_ID',
    'MUX_TOKEN_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];

  const requiredInProduction = [
    'DIRECT_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'PAYSTACK_PRO_PLAN_CODE',
    'PAYSTACK_PREMIUM_PLAN_CODE',
    'RESEND_API_KEY',
    'ANTHROPIC_API_KEY',
    'CRON_SECRET',
    'ADMIN_SECRET',
    'ADMIN_NOTIFICATION_EMAIL',
    'MANUAL_PAYOUTS_ENABLED',
    'NEXT_PUBLIC_ENV',
  ];

  const recommended = [
    'REDIS_URL',
    'SENTRY_DSN',
    'NODE_ENV',
    'NEXT_PUBLIC_DOJAH_APP_ID',
    'NEXT_PUBLIC_DOJAH_PUBLIC_KEY',
    'NEXT_PUBLIC_DOJAH_WIDGET_ID',
    'DOJAH_SECRET_KEY',
  ];

  const missing: string[] = [];
  const warnings: string[] = [];

  const isProduction = process.env.NODE_ENV === 'production' || process.env.CONTEXT === 'production';

  // Check required variables
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Enforce stricter checks in production deploys.
  if (isProduction) {
    for (const key of requiredInProduction) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }
  }

  // Cloudflare credentials may use either canonical or R2-prefixed names.
  const hasCloudflareAccountId = !!process.env.CLOUDFLARE_ACCOUNT_ID;
  const hasCloudflareAccessKeyId = !!(process.env.CLOUDFLARE_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID);
  const hasCloudflareSecretAccessKey = !!(process.env.CLOUDFLARE_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY);
  const hasCloudflareBucketName = !!(process.env.CLOUDFLARE_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME);

  if (!hasCloudflareAccountId) {
    missing.push('CLOUDFLARE_ACCOUNT_ID');
  }
  if (!hasCloudflareAccessKeyId) {
    missing.push('CLOUDFLARE_ACCESS_KEY_ID (or CLOUDFLARE_R2_ACCESS_KEY_ID)');
  }
  if (!hasCloudflareSecretAccessKey) {
    missing.push('CLOUDFLARE_SECRET_ACCESS_KEY (or CLOUDFLARE_R2_SECRET_ACCESS_KEY)');
  }
  if (!hasCloudflareBucketName) {
    missing.push('CLOUDFLARE_BUCKET_NAME (or CLOUDFLARE_R2_BUCKET_NAME)');
  }

  // Check recommended variables
  for (const key of recommended) {
    if (!process.env[key]) {
      warnings.push(`${key} not set (recommended for production)`);
    }
  }

  // Additional validation for specific services
  if (process.env.REDIS_URL && !process.env.REDIS_URL.startsWith('redis://')) {
    warnings.push('REDIS_URL should start with redis://');
  }

  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.startsWith('http')) {
    warnings.push('NEXT_PUBLIC_APP_URL should include protocol (http/https)');
  }

  if (
    isProduction &&
    process.env.NEXT_PUBLIC_APP_URL &&
    process.env.NEXT_PUBLIC_APP_URL !== 'https://foleio.com'
  ) {
    warnings.push('NEXT_PUBLIC_APP_URL should be https://foleio.com in production');
  }

  if (isProduction && process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL !== 'https://foleio.com') {
    warnings.push('NEXTAUTH_URL should be https://foleio.com in production');
  }

  const valid = missing.length === 0;

  return { valid, missing, warnings };
}

export function validateAndExit(): void {
  const result = validateEnvironment();

  if (!result.valid) {
    const isDev = process.env.NODE_ENV !== 'production';
    console.error('❌ CRITICAL: Missing required environment variables:');
    result.missing.forEach((key) => console.error(`   - ${key}`));
    console.error('\n💡 Please set these variables in your .env.local file');
    // In local/dev, don't kill the whole Next process on a transient miss
    // (HMR/worker race). Fail hard in production only.
    if (!isDev) {
      process.exit(1);
    }
    return;
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  ENVIRONMENT WARNINGS:');
    result.warnings.forEach((warning) => console.warn(`   - ${warning}`));
    console.warn('');
  }

  console.log('✅ Environment validation passed');
}

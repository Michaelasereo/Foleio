const context = process.env.CONTEXT || '';
const publicEnv = process.env.NEXT_PUBLIC_ENV || '';
const allowMismatch = process.env.ALLOW_NETLIFY_ENV_MISMATCH === '1';

if (!allowMismatch && context === 'production' && publicEnv !== 'production') {
  console.error(
    `❌ Invalid deploy configuration: CONTEXT=production requires NEXT_PUBLIC_ENV=production (received "${publicEnv || 'unset'}").`
  );
  process.exit(1);
}

if (context && context !== 'production' && publicEnv === 'production') {
  console.warn(
    `⚠️ Non-production context "${context}" is using NEXT_PUBLIC_ENV=production.`
  );
}

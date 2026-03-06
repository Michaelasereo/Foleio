# Cloudflare R2 Setup for Foleio Platform

## Environment Variables Required

Add these to your `.env.local` file:

```bash
# ============ CLOUDFLARE R2 CONFIGURATION ============
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=foleio-uploads
R2_PUBLIC_URL=https://pub-your_account_id.r2.dev
```

## Getting R2 Credentials

### Step 1: Create R2 Bucket
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 → Overview**
3. Click **Create bucket**
4. Name: `foleio-uploads`
5. Enable **Public access**

### Step 2: Generate API Token
1. Go to **R2 → Manage R2 API Tokens**
2. Click **Create API token**
3. Configure:
   - Token name: `foleio-platform`
   - Permissions: **Read & Write**
   - Resources: **Specific bucket** → `foleio-uploads`
4. **Copy the credentials:**
   - Access Key ID
   - Secret Access Key
   - Account ID (from dashboard URL)

### Step 3: Set Public URL
- Use: `https://pub-[ACCOUNT_ID].r2.dev`
- Or configure a custom domain

## Testing R2 Setup

Once configured, run this test in browser console:

```javascript
// Test R2 Profile Upload
(async () => {
  console.log('🖼️ Testing R2 Profile Upload...');

  // Create test image
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4ECDC4';
  ctx.fillRect(0, 0, 200, 200);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('R2 TEST', 100, 100);

  canvas.toBlob(async (blob) => {
    const testImage = new File([blob], 'r2-test.png', { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', testImage);
    formData.append('type', 'avatar');

    try {
      const response = await fetch('/api/upload/profile', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ R2 UPLOAD SUCCESS!');
        console.log('📍 URL:', result.data.url);
        console.log('🔑 Key:', result.data.key);
        console.log('📏 Size:', result.data.size, 'bytes');

        // Show the uploaded image
        const img = document.createElement('img');
        img.src = result.data.url;
        img.style.cssText = 'width: 100px; height: 100px; border: 2px solid #4CAF50; border-radius: 8px; margin: 10px;';
        document.body.appendChild(img);
        console.log('🖼️ Image displayed above!');
      } else {
        console.log('❌ R2 UPLOAD FAILED:', result.error);
      }
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }, 'image/png');
})();
```

## Features Implemented

✅ **R2 Client** - Production-ready S3-compatible client
✅ **Upload Service** - Handles validation, optimization, and fallbacks
✅ **Profile Upload API** - Updated to use R2 with fallbacks
✅ **Environment Validation** - Checks R2 configuration
✅ **Fallback System** - Uses placeholders when R2 not configured
✅ **Error Handling** - Comprehensive error management
✅ **Security** - File validation and size limits

## Without R2 (Development Mode)

If R2 is not configured, the system automatically falls back to placeholder images. This allows development to continue without R2 setup.

## With R2 (Production Mode)

When R2 is configured, uploads go directly to Cloudflare R2 with:
- Automatic CDN distribution
- Cost-effective storage
- Global performance
- Enterprise security

## Troubleshooting

### "R2 credentials not configured"
- Check `.env.local` has all R2 variables
- Restart the development server
- Verify variable names match exactly

### "Upload failed"
- Check R2 bucket exists and is accessible
- Verify API token has read/write permissions
- Check network connectivity to Cloudflare

### "File too large"
- Default limits: 5MB (avatar), 20MB (banner)
- Can be adjusted in upload service

## Production Deployment

For production, ensure:
1. R2 bucket is created and configured
2. API tokens have proper permissions
3. Environment variables are set in production
4. CDN is enabled for performance
5. Monitoring is set up for upload metrics

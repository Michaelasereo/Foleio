# Supabase Storage Setup for Foleio Platform

## Overview

Your Foleio platform now uses:
- **Supabase Storage** for images (avatars, banners, content images)
- **Mux** for videos (existing integration)
- **Fallback placeholders** for development

## Supabase Storage Setup

### Step 1: Create Storage Bucket

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Storage** in the sidebar
4. Click **Create bucket**
5. Bucket name: `crealio`
6. Make it **Public** (so images can be viewed)
7. Click **Create bucket**

### Step 2: Configure Bucket Policies

In the bucket settings:
1. Go to **Policies** tab
2. Add these policies one by one:

**Policy 1 - Allow authenticated users to upload files:**
```sql
bucket_id = 'crealio'
AND auth.role() = 'authenticated'
```

**Policy 2 - Allow public read access to images:**
```sql
bucket_id = 'crealio'
AND (storage.foldername(name))[1] = 'avatars'
OR (storage.foldername(name))[1] = 'banners'
OR (storage.foldername(name))[1] = 'images'
```

**IMPORTANT:** Copy and paste ONLY the SQL code between the ```sql markers, not the markdown formatting!

### Step 3: Environment Variables

Your `.env.local` should have:

```bash
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Mux (already configured)
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
```

## File Organization

Supabase Storage will organize files like this:

```
crealio/
├── avatars/
│   ├── user123/
│   │   ├── 1705123456789-abc123.jpg
│   │   └── 1705123456790-def456.png
│   └── user456/
│       └── 1705123456800-ghi789.jpg
├── banners/
│   ├── user123/
│   │   └── 1705123456810-jkl012.jpg
│   └── user456/
│       └── 1705123456820-mno345.jpg
└── images/
    └── user123/
        └── 1705123456830-pqr678.jpg
```

## Testing Supabase Storage

Run this test in your browser console:

```javascript
// Test Supabase Storage Integration
(async () => {
  console.log('🗄️ TESTING SUPABASE STORAGE INTEGRATION');
  console.log('======================================');
  console.log('');

  // 1. Check Supabase configuration
  console.log('1️⃣ CHECKING SUPABASE CONFIG...');
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js');
    const supabase = createClient(
      window.NEXT_PUBLIC_SUPABASE_URL || 'your-url',
      window.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-key'
    );

    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      console.log('❌ Supabase connection failed:', error.message);
    } else {
      const foleioBucket = data.find(b => b.name === 'foleio-uploads');
      console.log(`✅ Supabase connected: ${data.length} buckets found`);
      console.log(`📦 Foleio bucket: ${foleioBucket ? '✅ EXISTS' : '❌ MISSING'}`);
    }
  } catch (error) {
    console.log('❌ Supabase test failed:', error.message);
  }

  console.log('');

  // 2. Test image upload
  console.log('2️⃣ TESTING IMAGE UPLOAD...');

  // Create test image
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4ECDC4';
  ctx.fillRect(0, 0, 400, 400);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('SUPABASE TEST', 200, 200);

  canvas.toBlob(async (blob) => {
    const testImage = new File([blob], 'supabase-test.png', { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', testImage);
    formData.append('type', 'avatar');

    try {
      console.log('📤 Uploading to Supabase...');
      const response = await fetch('/api/upload/profile', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ SUPABASE UPLOAD SUCCESS!');
        console.log('📍 URL:', result.data.url);
        console.log('🔑 Key:', result.data.key);
        console.log('📏 Size:', result.data.size, 'bytes');
        console.log('☁️ Storage: SUPABASE');

        // Display the uploaded image
        const img = document.createElement('img');
        img.src = result.data.url;
        img.style.cssText = 'width: 100px; height: 100px; border-radius: 50%; border: 3px solid #4CAF50; margin: 10px;';
        document.body.appendChild(img);
        console.log('🖼️ Image displayed above!');
      } else {
        console.log('❌ SUPABASE UPLOAD FAILED:', result.error);
      }
    } catch (error) {
      console.log('❌ Upload test failed:', error.message);
    }
  }, 'image/png');
})();
```

## Migration from Placeholders

If you were using placeholder images, the new Supabase integration will:

1. **Automatically upload** real images to Supabase
2. **Update creator profiles** with real URLs
3. **Maintain backward compatibility** with existing data
4. **Use fallbacks** if Supabase is not configured

## Production Benefits

With Supabase Storage, you get:

✅ **Easy setup** (no Cloudflare account needed)
✅ **Integrated auth** (works with your existing Supabase users)
✅ **Real-time features** (built-in subscriptions)
✅ **File management** (admin dashboard in Supabase)
✅ **Cost-effective** (included in Supabase Pro plans)
✅ **CDN delivery** (global performance)

## Troubleshooting

### "Bucket not found"
- Create the `foleio-uploads` bucket in Supabase Storage
- Make sure it's public

### "Permission denied"
- Check bucket policies allow uploads
- Ensure user is authenticated

### "Upload failed"
- Check Supabase credentials
- Verify bucket exists and is accessible
- Check file size limits (50MB default)

## Next Steps

1. **Create the bucket** in Supabase Storage
2. **Set policies** for public access
3. **Test uploads** with the script above
4. **Update creator profiles** with real images
5. **Deploy to production** when ready

Your platform now has enterprise-grade storage! 🚀

// Debug script to check image URLs and display issues

console.log('🔍 FOLEIO Image Debug Script v2.0');
console.log('===============================');

// Check if we're on a creator profile page
const isCreatorPage = window.location.pathname.startsWith('/creator/');
const isSettingsPage = window.location.pathname.includes('/settings');
console.log('📍 Current page:', window.location.pathname);
console.log('👤 Is creator profile page:', isCreatorPage);
console.log('⚙️ Is settings page:', isSettingsPage);

// Function to check image properties
function checkImage(img, label) {
  if (!img) {
    console.log(`❌ ${label} image not found`);
    return;
  }

  console.log(`🖼️ ${label} image found:`);
  console.log('  - src:', img.src);
  console.log('  - alt:', img.alt);
  console.log('  - className:', img.className);

  // Check container
  const container = img.parentElement;
  console.log('  - Container classes:', container?.className);
  console.log('  - Container size:', container?.clientWidth, 'x', container?.clientHeight);

  // Check natural vs display size
  if (img.complete) {
    console.log('  - Natural size:', img.naturalWidth, 'x', img.naturalHeight);
    console.log('  - Display size:', img.clientWidth, 'x', img.clientHeight);
    console.log('  - Aspect ratio match:', Math.abs((img.clientWidth / img.clientHeight) - (img.naturalWidth / img.naturalHeight)) < 0.1 ? '✅ Good' : '⚠️ Poor');

    if (img.naturalWidth < 100 || img.naturalHeight < 100) {
      console.log('  ⚠️ WARNING: Image is very small - might be thumbnail!');
    }
  } else {
    console.log('  - Image not yet loaded');
  }

  // Test if URL is accessible
  fetch(img.src, { method: 'HEAD' })
    .then(response => {
      console.log('  - URL accessible:', response.ok ? '✅' : '❌', response.status);
      if (!response.ok) {
        console.log('  - ❌ Image URL returns error:', response.status);
      }
    })
    .catch(error => {
      console.log('  - ❌ Image URL fetch failed:', error.message);
    });
}

if (isCreatorPage) {
  // Check all images on creator profile page
  const allImages = document.querySelectorAll('img');
  console.log(`📊 Found ${allImages.length} images on page`);

  allImages.forEach((img, index) => {
    console.log(`\n--- Image ${index + 1} ---`);
    let label = 'Unknown';
    if (img.alt.includes('banner')) label = 'Banner';
    else if (img.alt.includes('avatar') || img.className.includes('rounded-full')) label = 'Avatar';
    else if (img.alt.includes('thumbnail')) label = 'Thumbnail';
    else label = img.alt || 'Content';

    checkImage(img, label);
  });
}

if (isSettingsPage) {
  console.log('\n--- SETTINGS PAGE CHECK ---');

  // Check file inputs
  const avatarInput = document.querySelector('input[type="file"][accept*="image"]');
  const bannerInput = document.querySelector('input[type="file"]');

  console.log('📁 Avatar input found:', !!avatarInput);
  console.log('📁 Banner input found:', !!bannerInput);

  // Check current images in settings
  const currentImages = document.querySelectorAll('img[src*="r2.dev"], img[src*="cloudflarestorage"]');
  console.log(`🖼️ Found ${currentImages.length} uploaded images in settings`);

  currentImages.forEach((img, index) => {
    console.log(`\n--- Settings Image ${index + 1} ---`);
    checkImage(img, `Settings ${img.alt || 'Image'}`);
  });
}

// Check localStorage for form persistence
console.log('\n--- FORM PERSISTENCE CHECK ---');
try {
  const keys = Object.keys(localStorage);
  const formKeys = keys.filter(key => key.includes('form-persistence'));
  console.log('💾 Form persistence keys:', formKeys);

  formKeys.forEach(key => {
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    console.log(`📄 ${key}:`, {
      hasAvatar: !!data.formData?.avatarUrl,
      hasBanner: !!data.formData?.bannerUrl,
      avatarUrl: data.formData?.avatarUrl?.substring(0, 50) + '...',
      bannerUrl: data.formData?.bannerUrl?.substring(0, 50) + '...',
    });
  });
} catch (error) {
  console.log('❌ Error checking localStorage:', error);
}

// Check for any failed image requests
let failedImages = [];
window.addEventListener('error', (event) => {
  if (event.target.tagName === 'IMG') {
    failedImages.push(event.target.src);
    console.log('❌ Image failed to load:', event.target.src);
  }
}, true);

// Summary
setTimeout(() => {
  console.log('\n🎯 DEBUG SUMMARY');
  console.log('================');

  if (failedImages.length > 0) {
    console.log('❌ Failed images:', failedImages.length);
    failedImages.forEach(url => console.log('  -', url));
  } else {
    console.log('✅ No failed image loads detected');
  }

  if (isCreatorPage) {
    const smallImages = Array.from(document.querySelectorAll('img')).filter(img =>
      img.complete && (img.naturalWidth < 200 || img.naturalHeight < 200)
    );
    if (smallImages.length > 0) {
      console.log('⚠️ Small images detected (possible thumbnails):', smallImages.length);
    } else {
      console.log('✅ All loaded images appear full-size');
    }
  }

  console.log('\n🔍 RECOMMENDED FIXES:');
  console.log('1. Check Cloudflare R2 bucket permissions');
  console.log('2. Verify image upload is saving full URLs');
  console.log('3. Check CSS is not constraining image sizes');
  console.log('4. Ensure images are uploaded in high resolution');
  console.log('5. Clear browser cache and try again');

}, 2000);

console.log('🎯 Debug script loaded - check results above and in 2 seconds for summary');

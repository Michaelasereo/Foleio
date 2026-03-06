
// 🎯 COMPREHENSIVE SETTINGS FORM UPLOAD DEBUG TEST
// Copy this entire script to your browser console at http://localhost:3000

(async () => {
  console.log('🎯 SETTINGS FORM UPLOAD DEBUG TEST');
  console.log('===================================');
  console.log('');
  
  // 1. Check if user is authenticated
  console.log('1️⃣ CHECKING AUTHENTICATION...');
  try {
    const authResponse = await fetch('/api/creator/me');
    const authData = await authResponse.json();
    
    if (authData.error) {
      console.log('❌ NOT AUTHENTICATED');
      console.log('💡 Please log in to Foleio first');
      console.log('🔗 http://localhost:3000/login');
      return;
    }
    
    console.log('✅ AUTHENTICATED:', authData.displayName || authData.username);
    console.log('');
    
  } catch (error) {
    console.log('❌ AUTH CHECK FAILED:', error.message);
    return;
  }
  
  // 2. Create test image (same as SettingsForm would create)
  console.log('2️⃣ CREATING TEST IMAGE (like SettingsForm)...');
  
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  
  // Gradient background (like a nice avatar)
  const gradient = ctx.createLinearGradient(0, 0, 200, 200);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 200, 200);
  
  // Add text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('DEBUG', 100, 90);
  ctx.font = '14px Arial';
  ctx.fillText('Test Image', 100, 115);
  
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const testImage = new File([blob], 'debug-avatar.png', { type: 'image/png' });
  
  console.log('✅ Test image created:', {
    name: testImage.name,
    type: testImage.type,
    size: testImage.size,
    dimensions: '200x200'
  });
  console.log('');
  
  // 3. Test EXACT same upload logic as SettingsForm
  console.log('3️⃣ TESTING EXACT SETTINGS FORM UPLOAD LOGIC...');
  
  // This mimics the exact uploadImage function from SettingsForm
  const uploadImage = async (file: File, type: 'avatar' | 'banner') => {
    console.log(`🔍 DEBUG: Starting ${type} upload`);
    console.log('File:', file.name, file.type, file.size, 'bytes');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type); // ⚠️ CRITICAL: This must be included
    
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.type}, ${value.size} bytes)` : value);
    }
    
    const response = await fetch('/api/upload/profile', {
      method: 'POST',
      body: formData,
    });
    
    console.log(`📊 Response status: ${response.status}`);
    
    if (!response.ok) {
      let errorMessage = 'Upload failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.details || errorMessage;
        console.error('📋 API Error details:', errorData);
      } catch {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
        console.error('📋 Raw error:', errorText);
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('✅ Upload successful:', data);
    
    const imageUrl = data.data?.url;
    if (imageUrl) {
      console.log('🔗 Returned URL:', imageUrl);
      return imageUrl;
    } else {
      throw new Error('No URL returned from upload');
    }
  };
  
  // Test avatar upload (same as SettingsForm)
  try {
    console.log('📤 TESTING AVATAR UPLOAD (like SettingsForm)...');
    const imageUrl = await uploadImage(testImage, 'avatar');
    
    if (imageUrl) {
      console.log('');
      console.log('🎉 🎉 🎉 SUCCESS! 🎉 🎉 🎉');
      console.log('✅ SETTINGS FORM UPLOAD SHOULD WORK!');
      console.log('🔗 Uploaded image URL:', imageUrl);
      console.log('');
      
      // Display the image
      const img = document.createElement('img');
      img.src = imageUrl;
      img.style.cssText = 'width: 200px; height: 200px; border-radius: 50%; border: 4px solid #4CAF50; margin: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);';
      img.onload = () => {
        console.log('🖼️ IMAGE LOADED SUCCESSFULLY!');
        document.body.appendChild(img);
      };
      img.onerror = () => {
        console.log('⚠️ Image URL is valid but failed to load');
        console.log('💡 Check Supabase bucket permissions');
      };
      
      console.log('');
      console.log('✅ VERDICT: SettingsForm upload should work perfectly!');
      console.log('💡 If SettingsForm still fails, check for JavaScript errors in browser dev tools');
      
    } else {
      console.log('❌ No URL returned');
    }
    
  } catch (error) {
    console.log('');
    console.log('❌ SETTINGS FORM UPLOAD TEST FAILED');
    console.log('🚨 ERROR:', error.message);
    console.log('');
    
    // Provide specific troubleshooting
    if (error.message.includes('type')) {
      console.log('🔧 FIX: Add formData.append("type", "avatar") in SettingsForm');
    } else if (error.message.includes('policy') || error.message.includes('permission')) {
      console.log('🔧 FIX: Check Supabase storage policies');
      console.log('💡 Go to: https://supabase.com/dashboard → Storage → crealio → Policies');
    } else if (error.message.includes('auth') || error.message.includes('Authentication')) {
      console.log('🔧 FIX: User is not logged in properly');
    } else if (error.message.includes('size') || error.message.includes('large')) {
      console.log('🔧 FIX: File is too large (max 5MB for avatar)');
    } else {
      console.log('🔧 FIX: Check server logs for detailed error');
    }
  }
  
  console.log('');
  console.log('🎯 DEBUG TEST COMPLETE');
  console.log('');
  console.log('📊 SUMMARY:');
  console.log('- ✅ Authentication: Working');
  console.log('- 🔄 Upload Logic: Tested');
  console.log('- ❓ SettingsForm: Check results above');
})();


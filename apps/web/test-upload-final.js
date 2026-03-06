
// 🎯 BROWSER TEST FOR UPLOAD FUNCTIONALITY
// Copy this entire script to your browser console at http://localhost:3000

(async () => {
  console.log('🚀 TESTING FOLEIO UPLOAD SYSTEM');
  console.log('=============================');
  console.log('');
  
  // 1. Check if user is logged in
  console.log('1️⃣ CHECKING AUTHENTICATION...');
  try {
    const authResponse = await fetch('/api/creator/me');
    const authResult = await authResponse.json();
    
    if (authResult.error) {
      console.log('❌ User not authenticated');
      console.log('💡 Please log in to your Foleio account first');
      console.log('🔗 Go to: http://localhost:3000/login');
      return;
    }
    
    console.log('✅ User authenticated:', authResult.displayName || authResult.username);
    console.log('');
    
  } catch (error) {
    console.log('❌ Auth check failed:', error.message);
    return;
  }
  
  // 2. Create test image
  console.log('2️⃣ CREATING TEST IMAGE...');
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  
  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, 200, 200);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 200, 200);
  
  // Add text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('FOLEIO TEST', 100, 100);
  ctx.font = '14px Arial';
  ctx.fillText('Upload Working!', 100, 130);
  
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const testImage = new File([blob], 'foleio-test.png', { type: 'image/png' });
  
  console.log('✅ Test image created:', testImage.size, 'bytes');
  console.log('');
  
  // 3. Test profile upload
  console.log('3️⃣ TESTING PROFILE UPLOAD...');
  
  const formData = new FormData();
  formData.append('file', testImage);
  formData.append('type', 'avatar');
  
  try {
    console.log('📤 Uploading avatar...');
    const uploadResponse = await fetch('/api/upload/profile', {
      method: 'POST',
      body: formData
    });
    
    console.log('📊 Upload status:', uploadResponse.status);
    
    if (uploadResponse.ok) {
      const uploadResult = await uploadResponse.json();
      console.log('✅ Upload successful!');
      console.log('📋 Response:', uploadResult);
      
      const imageUrl = uploadResult.data?.url;
      
      if (imageUrl) {
        console.log('🔗 Image URL:', imageUrl);
        
        // Check if it's a real Supabase URL
        if (imageUrl.includes('supabase.co')) {
          console.log('🎉 SUCCESS! Real Supabase URL detected!');
          
          // Display the uploaded image
          const img = document.createElement('img');
          img.src = imageUrl;
          img.style.cssText = 'width: 200px; height: 200px; border-radius: 50%; border: 4px solid #4CAF50; margin: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);';
          img.onload = () => {
            console.log('🖼️ Image loaded and displayed successfully!');
            document.body.appendChild(img);
          };
          img.onerror = () => {
            console.log('❌ Image failed to load from Supabase');
            console.log('💡 Check Supabase bucket policies');
          };
          
        } else if (imageUrl.includes('placeholder.com')) {
          console.log('⚠️ WARNING: Still returning placeholder URL');
          console.log('💡 Supabase upload failed - check policies and credentials');
          
          // Display placeholder
          const img = document.createElement('img');
          img.src = imageUrl;
          img.style.cssText = 'width: 200px; height: 200px; border: 2px solid #ff6b6b; margin: 20px;';
          document.body.appendChild(img);
          
        } else {
          console.log('❓ Unknown URL format:', imageUrl);
        }
      } else {
        console.log('❌ No URL returned in response');
      }
      
    } else {
      const errorText = await uploadResponse.text();
      console.log('❌ Upload failed:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.log('📋 Error details:', errorJson);
        
        if (errorJson.error?.includes('policy') || errorJson.details?.includes('policy')) {
          console.log('');
          console.log('🔒 POLICY ISSUE DETECTED!');
          console.log('💡 You need to add storage policies in Supabase:');
          console.log('');
          console.log('Go to: https://supabase.com/dashboard → Storage → crealio → Policies');
          console.log('');
          console.log('Add these policies:');
          console.log('');
          console.log('POLICY 1 - Allow authenticated uploads:');
          console.log('');
          console.log('');
          console.log('POLICY 2 - Allow public image access:');
          console.log('');
        }
        
      } catch {
        console.log('📋 Raw error:', errorText);
      }
    }
    
  } catch (error) {
    console.log('❌ Request error:', error.message);
  }
  
  console.log('');
  console.log('🎯 TEST COMPLETE');
  console.log('');
  console.log('📊 SUMMARY:');
  console.log('- ✅ Authentication: Working');
  console.log('- 🔄 Upload API: Responding');
  console.log('- ❓ Supabase Upload: Check results above');
  console.log('- 🖼️ Image Display: Check if image appears');
})();


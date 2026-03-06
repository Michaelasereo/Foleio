// Test Content Upload Script for Foleio Platform
// Run this in the browser console while logged in to http://localhost:3000

(async function testContentUpload() {
  console.log('🚀 Starting Foleio Content Upload Test...');

  try {
    // Get authentication token from localStorage or cookies
    const getAuthToken = () => {
      // Try localStorage first
      const token = localStorage.getItem('supabase.auth.token');
      if (token) {
        try {
          const parsed = JSON.parse(token);
          return parsed?.access_token || parsed?.currentSession?.access_token;
        } catch (e) {
          console.log('Could not parse token from localStorage');
        }
      }

      // Try cookies
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name.includes('supabase-auth-token')) {
          try {
            const parsed = JSON.parse(decodeURIComponent(value));
            return parsed?.access_token;
          } catch (e) {
            console.log('Could not parse token from cookies');
          }
        }
      }

      console.warn('⚠️ No auth token found. Make sure you are logged in!');
      return null;
    };

    const authToken = getAuthToken();
    if (!authToken) {
      alert('Please log in first!');
      return;
    }

    console.log('✅ Auth token found');

    // Test data
    const testVideo = {
      title: 'Test Video - Mux Streaming',
      description: 'This is a test video uploaded via Mux streaming',
      type: 'video',
      accessType: 'free',
      contentCategory: 'content'
    };

    const testImage = {
      title: 'Test Image - Cloudflare R2',
      description: 'This is a test image stored on Cloudflare R2',
      type: 'image',
      accessType: 'free',
      contentCategory: 'content'
    };

    // Create sample files for testing
    const createTestVideoFile = () => {
      // Create a simple test video file (this won't be a real video, just for testing the upload flow)
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');

      // Create a simple animation
      ctx.fillStyle = '#FF6B6B';
      ctx.fillRect(0, 0, 640, 360);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('TEST VIDEO', 320, 180);
      ctx.fillText('Foleio Platform', 320, 240);

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          const file = new File([blob], 'test-video.mp4', { type: 'video/mp4' });
          resolve(file);
        }, 'video/mp4');
      });
    };

    const createTestImageFile = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');

      // Create a gradient background
      const gradient = ctx.createLinearGradient(0, 0, 800, 600);
      gradient.addColorStop(0, '#667EEA');
      gradient.addColorStop(1, '#764BA2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 600);

      // Add text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('TEST IMAGE', 400, 280);
      ctx.font = '24px Arial';
      ctx.fillText('Cloudflare R2 Storage', 400, 320);
      ctx.fillText('Foleio Platform', 400, 350);

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          const file = new File([blob], 'test-image.jpg', { type: 'image/jpeg' });
          resolve(file);
        }, 'image/jpeg');
      });
    };

    // Upload functions
    const uploadVideo = async (file) => {
      console.log('🎬 Uploading video to Mux...');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Video upload failed: ${error}`);
      }

      const result = await response.json();
      console.log('✅ Video upload successful:', result);
      return result;
    };

    const uploadImage = async (file) => {
      console.log('🖼️ Uploading image to Cloudflare R2...');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);

      const response = await fetch('/api/upload/r2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Image upload failed: ${error}`);
      }

      const result = await response.json();
      console.log('✅ Image upload successful:', result);
      return result;
    };

    const createContent = async (contentData, uploadResult) => {
      console.log('📝 Creating content record...');

      const payload = {
        ...contentData,
        tags: [],
        requiredPlanId: undefined,
        collectionId: undefined,
        tutorialPrice: undefined,
        ...uploadResult // Spread the upload result fields
      };

      const response = await fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Content creation failed: ${error}`);
      }

      const result = await response.json();
      console.log('✅ Content created successfully:', result);
      return result;
    };

    // Main test execution
    console.log('🎯 Starting video upload test...');

    // Test video upload
    const videoFile = await createTestVideoFile();
    const videoUploadResult = await uploadVideo(videoFile);
    const videoContent = await createContent(testVideo, {
      muxAssetId: videoUploadResult.muxAssetId,
      muxPlaybackId: videoUploadResult.muxPlaybackId
    });

    console.log('🎯 Starting image upload test...');

    // Test image upload
    const imageFile = await createTestImageFile();
    const imageUploadResult = await uploadImage(imageFile);
    const imageContent = await createContent(testImage, {
      url: imageUploadResult.url
    });

    console.log('🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('📊 Test Results:');
    console.log('- Video Content ID:', videoContent.contentId);
    console.log('- Image Content ID:', imageContent.contentId);
    console.log('- Video Playback ID:', videoUploadResult.muxPlaybackId);
    console.log('- Image URL:', imageUploadResult.url);

    alert('✅ Content upload tests completed!\n\nCheck your content list and browser console for details.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    alert('❌ Test failed: ' + error.message);
  }
})();

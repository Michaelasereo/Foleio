// Foleio Content Upload Test - Copy and paste this into browser console
// Make sure you're logged in at http://localhost:3000

(async function testUploads() {
  console.log('🚀 Foleio Content Upload Test Starting...');

  // Test video upload
  console.log('🎬 Testing Video Upload (Mux)...');
  try {
    // Create a test video file
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FF6B6B';
    ctx.fillRect(0, 0, 640, 360);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TEST VIDEO', 320, 180);

    const videoBlob = await new Promise(resolve => canvas.toBlob(resolve, 'video/mp4'));
    const videoFile = new File([videoBlob], 'test-video.mp4', { type: 'video/mp4' });

    const videoFormData = new FormData();
    videoFormData.append('file', videoFile);

    const videoResponse = await fetch('/api/upload/stream', {
      method: 'POST',
      body: videoFormData
    });

    const videoResult = await videoResponse.json();

    if (videoResponse.ok) {
      console.log('✅ Video upload successful:', videoResult);

      // Create video content
      const videoContentResponse = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Video - Mux Streaming',
          description: 'Test video uploaded via Mux',
          type: 'video',
          accessType: 'free',
          contentCategory: 'content',
          muxAssetId: videoResult.muxAssetId,
          muxPlaybackId: videoResult.muxPlaybackId
        })
      });

      const videoContent = await videoContentResponse.json();
      console.log('✅ Video content created:', videoContent);
    } else {
      console.error('❌ Video upload failed:', videoResult);
    }
  } catch (error) {
    console.error('❌ Video test error:', error);
  }

  // Test image upload
  console.log('🖼️ Testing Image Upload (Cloudflare R2)...');
  try {
    // Create a test image file
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 800, 600);
    gradient.addColorStop(0, '#667EEA');
    gradient.addColorStop(1, '#764BA2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TEST IMAGE', 400, 280);
    ctx.font = '24px Arial';
    ctx.fillText('Cloudflare R2', 400, 320);

    const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
    const imageFile = new File([imageBlob], 'test-image.jpg', { type: 'image/jpeg' });

    const imageFormData = new FormData();
    imageFormData.append('file', imageFile);
    imageFormData.append('fileName', imageFile.name);

    const imageResponse = await fetch('/api/upload/r2', {
      method: 'POST',
      body: imageFormData
    });

    const imageResult = await imageResponse.json();

    if (imageResponse.ok) {
      console.log('✅ Image upload successful:', imageResult);

      // Create image content
      const imageContentResponse = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Image - Cloudflare R2',
          description: 'Test image stored on R2',
          type: 'image',
          accessType: 'free',
          contentCategory: 'content',
          url: imageResult.url
        })
      });

      const imageContent = await imageContentResponse.json();
      console.log('✅ Image content created:', imageContent);
    } else {
      console.error('❌ Image upload failed:', imageResult);
    }
  } catch (error) {
    console.error('❌ Image test error:', error);
  }

  console.log('🎉 Test completed! Check your content list at /content');
})();

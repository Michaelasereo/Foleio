// 🚨 EMERGENCY VIDEO UPLOAD DEBUG SCRIPT
// Paste this entire script into your browser console BEFORE trying to upload

console.log('🚨 EMERGENCY UPLOAD DEBUG ACTIVATED');
console.log('=====================================');

// 1. Check authentication status
async function checkAuth() {
  console.log('🔐 Checking authentication...');
  try {
    const { data, error } = await window.supabase?.auth.getSession();
    console.log('Session data:', data);
    console.log('Session error:', error);
    console.log('User authenticated:', !!data?.session?.user);
    return !!data?.session?.user;
  } catch (error) {
    console.error('Auth check failed:', error);
    return false;
  }
}

// 2. Check environment
function checkEnvironment() {
  console.log('🌍 Environment check:');
  console.log('- Current URL:', window.location.href);
  console.log('- Online status:', navigator.onLine);
  console.log('- User agent:', navigator.userAgent);
  console.log('- Supabase available:', !!window.supabase);
}

// 3. Enhanced fetch interceptor
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const url = args[0];
  const options = args[1] || {};

  if (url.includes('/api/upload/stream')) {
    console.log('🎬 INTERCEPTED UPLOAD REQUEST');
    console.log('URL:', url);
    console.log('Method:', options.method);
    console.log('Headers:', options.headers);
    console.log('Body type:', options.body instanceof FormData ? 'FormData' : typeof options.body);

    // Log FormData contents if available
    if (options.body instanceof FormData) {
      console.log('📦 FormData contents:');
      for (let [key, value] of options.body.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }
    }

    const startTime = Date.now();
    try {
      const response = await originalFetch.apply(this, args);
      const duration = Date.now() - startTime;

      console.log('🎬 UPLOAD RESPONSE RECEIVED');
      console.log('Status:', response.status, response.statusText);
      console.log('Duration:', duration + 'ms');
      console.log('Headers:', Object.fromEntries(response.headers.entries()));

      // Clone response to read body without consuming it
      const clonedResponse = response.clone();
      const responseText = await clonedResponse.text();
      console.log('📄 Response body (first 1000 chars):', responseText.substring(0, 1000));

      if (!response.ok) {
        console.error('❌ UPLOAD FAILED!');
        console.error('Status:', response.status);
        console.error('Response:', responseText);

        // Try to parse as JSON for better error display
        try {
          const errorData = JSON.parse(responseText);
          console.error('Parsed error:', errorData);
        } catch (parseError) {
          console.log('Response is not JSON');
        }
      } else {
        console.log('✅ UPLOAD APPEARS SUCCESSFUL');
        try {
          const successData = JSON.parse(responseText);
          console.log('Success data:', successData);
        } catch (parseError) {
          console.log('Success response is not JSON');
        }
      }

      return response;
    } catch (networkError) {
      console.error('💥 NETWORK ERROR during upload:', networkError);
      throw networkError;
    }
  }

  // For all other requests, just call original fetch
  return originalFetch.apply(this, args);
};

// 4. Test API connectivity
async function testAPIConnectivity() {
  console.log('🔗 Testing API connectivity...');

  try {
    const healthResponse = await fetch('/api/health/env-check');
    const healthData = await healthResponse.json();
    console.log('✅ Health check passed:', healthData);
  } catch (error) {
    console.error('❌ Health check failed:', error);
  }

  try {
    const authResponse = await fetch('/api/creator/me');
    console.log('🔐 Auth endpoint response:', authResponse.status);
    if (authResponse.status === 401) {
      console.log('✅ Auth check working (401 expected for unauthenticated)');
    } else {
      console.warn('⚠️ Unexpected auth response:', authResponse.status);
    }
  } catch (error) {
    console.error('❌ Auth check failed:', error);
  }
}

// 5. Monitor file selection
function monitorFileSelection() {
  console.log('👀 Monitoring file selection...');

  // Override file input change events
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    if (type === 'change' && this.type === 'file') {
      const originalListener = listener;
      const wrappedListener = function(event) {
        console.log('📁 FILE INPUT CHANGED');
        const files = event.target.files;
        if (files && files.length > 0) {
          const file = files[0];
          console.log('Selected file:', {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
          });

          // Validate file
          const errors = [];
          if (file.size === 0) errors.push('File is empty');
          if (file.size > 500 * 1024 * 1024) errors.push('File too large (max 500MB)');
          const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
          if (!allowedTypes.includes(file.type)) errors.push(`Invalid type: ${file.type}`);

          if (errors.length > 0) {
            console.error('❌ FILE VALIDATION FAILED:', errors);
          } else {
            console.log('✅ FILE VALIDATION PASSED');
          }
        }
        return originalListener.call(this, event);
      };
      return originalAddEventListener.call(this, type, wrappedListener, options);
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
}

// 6. Run initial checks
async function runInitialChecks() {
  console.log('\\n🔍 RUNNING INITIAL DIAGNOSTICS...');
  await checkAuth();
  checkEnvironment();
  await testAPIConnectivity();
  monitorFileSelection();

  console.log('\\n✅ DEBUG SYSTEM READY');
  console.log('📋 Now try uploading your video file and watch the console for detailed logs!');
  console.log('🎯 Look for error messages and share them for targeted fixes.');
}

// Auto-run when script is loaded
runInitialChecks();

// Export functions for manual testing
window.debugUpload = {
  checkAuth,
  checkEnvironment,
  testAPIConnectivity,
  runInitialChecks
};

console.log('\\n💡 MANUAL COMMANDS AVAILABLE:');
console.log('window.debugUpload.checkAuth() - Check authentication');
console.log('window.debugUpload.testAPIConnectivity() - Test API endpoints');
console.log('\\n🎬 Ready for upload testing!');

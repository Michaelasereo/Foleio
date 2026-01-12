'use client';

import { useState, useRef, useEffect } from 'react';

interface MuxVideoPlayerProps {
  playbackId: string;
  assetId?: string;
  title?: string;
  thumbnailUrl?: string;
  className?: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export function MuxVideoPlayer({
  playbackId,
  assetId,
  title,
  thumbnailUrl,
  className = '',
  autoplay = false,
  muted = false,
  controls = true,
  onPlay,
  onPause,
  onEnded,
}: MuxVideoPlayerProps) {
  console.log('MuxVideoPlayer render:', { playbackId, assetId, title });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [useHlsJs, setUseHlsJs] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  // Define playback URLs - try MP4 first, fallback to HLS
  const hlsUrl = `https://stream.mux.com/${playbackId}.m3u8`;
  const mp4Url = `https://stream.mux.com/${playbackId}/low.mp4`; // Try low quality MP4 first
  const playbackUrl = hlsUrl; // Primary is HLS, but we'll add MP4 as fallback source

  console.log('MuxVideoPlayer props:', { playbackId, assetId, title });
  console.log('MuxVideoPlayer playback URL:', playbackUrl);

  // Test if the video URL is accessible
  if (typeof window !== 'undefined' && playbackId) {
    fetch(playbackUrl, {
      method: 'HEAD',
      mode: 'cors'
    })
      .then(response => {
        console.log('Video URL accessibility test:', response.status, response.ok);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      })
      .catch(error => {
        console.error('Video URL accessibility test failed:', error);
      });

    // Also try a simple fetch of the manifest
    fetch(playbackUrl, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/x-mpegURL,*/*'
      }
    })
      .then(response => {
        console.log('Manifest fetch test:', response.status, response.ok);
        if (response.ok) {
          return response.text();
        }
      })
      .then(text => {
        if (text) {
          console.log('Manifest preview:', text.substring(0, 200) + '...');
        }
      })
      .catch(error => {
        console.error('Manifest fetch failed:', error);
      });
  }

  // Load Mux player script and HLS.js dynamically
  useEffect(() => {
    const loadScripts = async () => {
      // Check if scripts are already loaded
      if (window.mux && window.mux.player) {
        console.log('Mux player already loaded');
        setScriptsLoaded(true);
        setIsLoading(false);
        return;
      }
      
      if (window.Hls && typeof window.Hls === 'function') {
        console.log('HLS.js already loaded');
        setScriptsLoaded(true);
      }

      console.log('Loading video scripts...');

      // Load HLS.js first (for HTML5 fallback)
      if (!window.Hls) {
        const hlsScript = document.createElement('script');
        hlsScript.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.10/dist/hls.min.js';
        hlsScript.async = true;

        await new Promise((resolve, reject) => {
          hlsScript.onload = () => {
            console.log('✅ HLS.js loaded successfully');
            setScriptsLoaded(true);
            resolve(true);
          };
          hlsScript.onerror = (e) => {
            console.warn('⚠️ HLS.js failed to load, HTML5 fallback may not work with HLS streams');
            setScriptsLoaded(true); // Still mark as loaded so fallback can proceed
            resolve(false); // Don't fail completely
          };
          document.head.appendChild(hlsScript);
        });
      } else {
        // HLS.js already loaded
        setScriptsLoaded(true);
      }

      // Load Mux player from official CDN with fallback
      const muxScript = document.createElement('script');
      muxScript.src = 'https://cdn.jsdelivr.net/npm/@mux/mux-player@2/dist/index.js';
      muxScript.crossOrigin = 'anonymous';
      muxScript.async = true;
      muxScript.onload = () => {
        console.log('✅ Mux player loaded successfully');
        setScriptsLoaded(true);
        setIsLoading(false);
        setError(null);
      };
      muxScript.onerror = (e) => {
        // Mux player script failed - this is OK, we'll use HLS.js fallback
        console.warn('⚠️ Mux player script failed to load, using HLS.js fallback');
        // Don't set scriptsLoaded here - it should already be set from HLS.js loading
        setIsLoading(false);
      };

      document.head.appendChild(muxScript);
    };

    loadScripts();
  }, []);

  // Initialize HLS.js for HTML5 fallback when needed
  useEffect(() => {
    // Cleanup previous HLS instance if playbackId changes
    if (hlsRef.current) {
      console.log('🧹 Cleaning up previous HLS instance');
      hlsRef.current.destroy();
      hlsRef.current = null;
      setUseHlsJs(false);
    }
    
    if (!playbackId || !videoRef.current || !scriptsLoaded) {
      console.log('HLS init skipped:', { playbackId: !!playbackId, videoRef: !!videoRef.current, scriptsLoaded });
      return;
    }

    // Check script availability - always prefer HLS.js over native support since native is failing
    const hasMuxPlayer = typeof window !== 'undefined' && window.mux?.player;
    const hasHlsJs = typeof window !== 'undefined' && window.Hls && typeof window.Hls === 'function';

    console.log('Script availability:', { hasMuxPlayer, hasHlsJs, windowHls: !!window.Hls });

    // Force HLS.js usage if available, regardless of native support (since native is failing)
    const shouldUseHLS = hasHlsJs && !hasMuxPlayer;

    if (shouldUseHLS && videoRef.current) {
      console.log('🎬 Initializing HLS.js (preferred over native HLS)...');
      
      // CRITICAL: Clear src and remove any source elements before attaching HLS.js
      // HLS.js needs a clean video element with no src attribute
      if (videoRef.current.src) {
        console.log('🧹 Clearing video src before HLS.js attachment');
        videoRef.current.src = '';
        videoRef.current.removeAttribute('src');
      }
      
      // Remove any source elements that might interfere
      const sourceElements = videoRef.current.querySelectorAll('source');
      sourceElements.forEach(source => source.remove());
      
      setUseHlsJs(true);

      const hls = new window.Hls({
        enableWorker: false, // Disable worker for better compatibility
        debug: false, // Disable debug to reduce console noise
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        xhrSetup: (xhr, url) => {
          // Ensure CORS is properly configured
          xhr.withCredentials = false;
          xhr.setRequestHeader('Accept', 'application/x-mpegURL,*/*');
        }
      });
      
      // Store HLS instance in ref for cleanup
      hlsRef.current = hls;

      console.log('🎬 HLS.js: Loading source and attaching media');
      // Load source first, then attach (this is the correct order)
      hls.loadSource(playbackUrl);
      
      // Small delay to ensure source is loaded before attaching
      setTimeout(() => {
        if (videoRef.current && hlsRef.current === hls) {
          // Double-check src is still empty before attaching
          if (!videoRef.current.src || videoRef.current.src === '') {
            hls.attachMedia(videoRef.current);
          } else {
            console.warn('⚠️ Video src was set, clearing before HLS attachment');
            videoRef.current.src = '';
            hls.attachMedia(videoRef.current);
          }
        }
      }, 50);

      hls.on(window.Hls.Events.MEDIA_ATTACHED, () => {
        console.log('📎 HLS media attached successfully');
      });

      hls.on(window.Hls.Events.MANIFEST_LOADING, () => {
        console.log('📋 HLS manifest loading');
      });

      hls.on(window.Hls.Events.MANIFEST_LOADED, () => {
        console.log('📄 HLS manifest loaded');
      });

      hls.on(window.Hls.Events.LEVEL_LOADING, () => {
        console.log('📊 HLS level loading');
      });

      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ HLS manifest parsed, video should load');
        setIsLoading(false);
      });

      hls.on(window.Hls.Events.ERROR, (event, data) => {
        console.error('❌ HLS.js error:', data);
        console.error('❌ Error details:', {
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          url: data.url
        });

        if (data.fatal) {
          switch(data.type) {
            case window.Hls.ErrorTypes.NETWORK_ERROR:
              console.log('🔄 Network error, trying to recover');
              try {
                hls.startLoad();
              } catch (e) {
                console.log('🔄 Recovery failed, falling back to native HLS');
                hls.destroy();
                hlsRef.current = null;
                setUseHlsJs(false);
                if (videoRef.current) {
                  videoRef.current.src = playbackUrl;
                  videoRef.current.load();
                }
              }
              break;
            case window.Hls.ErrorTypes.MEDIA_ERROR:
              console.log('🔄 Media error, trying to recover');
              try {
                hls.recoverMediaError();
              } catch (e) {
                console.log('🔄 Media recovery failed, trying native HLS');
                hls.destroy();
                hlsRef.current = null;
                setUseHlsJs(false);
                if (videoRef.current) {
                  videoRef.current.src = playbackUrl;
                  videoRef.current.load();
                }
              }
              break;
            default:
              console.log('🔄 Fatal HLS.js error, falling back to native browser HLS');
              hls.destroy();
              hlsRef.current = null;
              setUseHlsJs(false);
              setError(`HLS streaming failed: ${data.type}`);
              setIsLoading(false);
              // Final fallback to native browser HLS
              if (videoRef.current) {
                console.log('🔄 Final fallback to native HLS');
                videoRef.current.src = playbackUrl;
                videoRef.current.load();
              }
              break;
          }
        }
      });

      // Set a timeout to fallback if HLS takes too long
      const fallbackTimeout = setTimeout(() => {
        if (videoRef.current && !videoRef.current.currentSrc && hlsRef.current === hls) {
          console.log('⏰ HLS.js timeout, falling back to native HLS');
          // Destroy HLS.js and let browser handle it natively
          hls.destroy();
          hlsRef.current = null;
          setUseHlsJs(false);
          if (videoRef.current) {
            videoRef.current.src = playbackUrl;
            videoRef.current.load();
          }
          setIsLoading(false);
        }
      }, 8000); // 8 second timeout (increased for slower connections)

      return () => {
        clearTimeout(fallbackTimeout);
        if (hlsRef.current === hls) {
          hls.destroy();
          hlsRef.current = null;
          setUseHlsJs(false);
        }
      };
    } else if (!hasMuxPlayer && !hasHlsJs) {
      // No scripts available, try native browser HLS
      console.log('📺 No scripts available, trying native browser HLS');
      if (videoRef.current && !videoRef.current.src) {
        videoRef.current.src = playbackUrl;
        setIsLoading(false);
      }
    }
  }, [playbackId, playbackUrl, scriptsLoaded]);

  // Emergency fallback: if nothing works after 15 seconds, force native HLS (only if not using HLS.js)
  useEffect(() => {
    if (playbackId && videoRef.current && !useHlsJs) {
      const emergencyTimeout = setTimeout(() => {
        if (videoRef.current && !videoRef.current.currentSrc && videoRef.current.readyState === 0 && !useHlsJs) {
          console.log('🚨 EMERGENCY: Forcing native HLS after all else failed');
          videoRef.current.src = playbackUrl;
          videoRef.current.load();
          setIsLoading(false);
        }
      }, 15000); // 15 second emergency timeout

      return () => clearTimeout(emergencyTimeout);
    }
  }, [playbackId, playbackUrl, useHlsJs]);

  // Force video source loading immediately (only if not using HLS.js)
  useEffect(() => {
    // Don't set src if we're using or planning to use HLS.js
    const willUseHLS = typeof window !== 'undefined' && !window.mux?.player && window.Hls;

    if (playbackId && videoRef.current && !videoRef.current.src && !willUseHLS && !useHlsJs) {
      console.log('🎯 Setting video source directly (no HLS.js):', playbackUrl);
      videoRef.current.src = playbackUrl;

      // Force a load to ensure the video element recognizes the source
      setTimeout(() => {
        if (videoRef.current && !useHlsJs) {
          videoRef.current.load();
          console.log('📺 Video load() called, src:', videoRef.current.src);
        }
      }, 100);
    }
  }, [playbackId, playbackUrl, useHlsJs]);

  // Additional fallback after scripts load (only if not using HLS.js)
  useEffect(() => {
    if (playbackId && videoRef.current && !useHlsJs) {
      const timer = setTimeout(() => {
        if (videoRef.current && !videoRef.current.currentSrc && !useHlsJs) {
          console.log('🚨 Emergency fallback: Forcing video source');
          videoRef.current.src = playbackUrl;
          videoRef.current.load();
          setIsLoading(false);
        }
      }, 5000); // Increased timeout

      return () => clearTimeout(timer);
    }
  }, [playbackId, playbackUrl, useHlsJs]);

  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
  };

  const handleCanPlay = () => {
    console.log('🎵 Video can play now!');
    setIsLoading(false);
  };

  const handleError = (e: any) => {
    const videoElement = e?.target;
    const error = videoElement?.error;

    console.error('🎥 Video element error details:');
    console.error('- Error code:', error?.code);
    console.error('- Error message:', error?.message);
    console.error('- Video src:', videoElement?.src);
    console.error('- Video currentSrc:', videoElement?.currentSrc);
    console.error('- Network state:', videoElement?.networkState);
    console.error('- Ready state:', videoElement?.readyState);

    // Don't show error immediately if no source is set yet
    if (!videoElement?.src && !videoElement?.currentSrc) {
      console.log('⚠️ Video error but no source set yet, ignoring');
      return;
    }

    setIsLoading(false);
    setError(`Failed to load video: ${error?.message || 'Unknown error'}`);
    console.error('Video player error:', e);
    console.error('Playback URL that failed:', playbackUrl);
    console.error('Playback ID:', playbackId);
    console.error('Browser supports HLS natively:', typeof window !== 'undefined' && 'MediaSource' in window);
    console.error('HLS.js available:', typeof window !== 'undefined' && window.Hls);
  };

  const handlePlay = () => {
    onPlay?.();
  };

  const handlePause = () => {
    onPause?.();
  };

  const handleEnded = () => {
    onEnded?.();
  };

  // Check if playbackId is available
  if (!playbackId) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎬</span>
          </div>
          <div className="text-lg mb-2">Video Still Processing</div>
          <div className="text-sm">Your video is still being processed by Mux. Please wait a few more minutes and refresh the page.</div>
          <div className="text-xs mt-2 text-gray-400">
            Asset ID: {assetId || 'None'}
          </div>
        </div>
      </div>
    );
  }

  console.log('MuxVideoPlayer playback URL:', playbackUrl);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-lg mb-2">⚠️ Video Error</div>
          <div className="text-sm mb-2">{error}</div>
          <div className="text-xs text-gray-400 mb-3">
            <div>Playback ID: {playbackId}</div>
          </div>
          <div className="text-sm">
            <a
              href={playbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Try opening video directly →
            </a>
          </div>
          <div className="text-xs mt-2 text-gray-400">
            If the direct link works, there may be a browser compatibility issue.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Simplified video player - conditionally render source tags based on HLS.js usage */}
      <video
        ref={videoRef}
        poster={thumbnailUrl}
        className="w-full h-full rounded-lg"
        controls={controls}
        autoPlay={autoplay}
        muted={muted}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onError={(e) => {
          console.error('🎥 Video element error event:', e);
          console.error('🎥 Video element error code:', e.target?.error?.code);
          console.error('🎥 Video element error message:', e.target?.error?.message);
          console.error('🎥 Video network state:', e.target?.networkState);
          console.error('🎥 Video ready state:', e.target?.readyState);
          handleError(e);
        }}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onLoadedData={() => {
          console.log('🎥 Video loaded data');
          setIsLoading(false);
        }}
        onLoadedMetadata={() => console.log('🎥 Video loaded metadata')}
        onStalled={() => console.log('🎥 Video stalled')}
        onSuspend={() => console.log('🎥 Video suspended')}
        onWaiting={() => console.log('🎥 Video waiting')}
        style={{
          aspectRatio: '16/9',
          width: '100%',
          height: 'auto',
        }}
        preload="metadata"
      >
        {/* Only render source tags if NOT using HLS.js (HLS.js needs empty video element) */}
        {!useHlsJs && (
          <>
            {/* Try MP4 first (more compatible) */}
            <source src={mp4Url} type="video/mp4" />
            {/* Fallback to HLS */}
            <source src={hlsUrl} type="application/x-mpegURL" />
            <p className="text-gray-500 text-sm">
              Your browser doesn't support this video format.
              <a href={mp4Url} className="text-blue-600 underline ml-1">
                Try MP4 version
              </a>
              {' or '}
              <a href={hlsUrl} className="text-blue-600 underline ml-1">
                HLS version
              </a>
            </p>
          </>
        )}
      </video>
    </div>
  );
}

// Add TypeScript declarations for Mux player and HLS.js
declare global {
  interface Window {
    mux?: {
      player?: any;
    };
    Hls?: any;
  }
}

export default MuxVideoPlayer;



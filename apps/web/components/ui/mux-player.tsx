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
  const videoRef = useRef<HTMLVideoElement>(null);

  // Define playback URL first (before any useEffect)
  const playbackUrl = `https://stream.mux.com/${playbackId}.m3u8`;

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

      // Load Mux player from official CDN
      const muxScript = document.createElement('script');
      muxScript.src = 'https://unpkg.com/@mux/mux-player@2/dist/index.js';
      muxScript.async = true;
      muxScript.onload = () => {
        console.log('✅ Mux player loaded successfully');
        setScriptsLoaded(true);
        setIsLoading(false);
        setError(null);
      };
      muxScript.onerror = (e) => {
        console.error('❌ Failed to load Mux player script:', e);
        console.warn('Falling back to HTML5 video with HLS.js');
        // Don't set scriptsLoaded here - it should already be set from HLS.js loading
        setIsLoading(false);
      };

      document.head.appendChild(muxScript);
    };

    loadScripts();
  }, []);

  // Initialize HLS.js for HTML5 fallback when needed
  useEffect(() => {
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

      const hls = new window.Hls({
        enableWorker: false, // Disable worker for better compatibility
        debug: true, // Enable debug for troubleshooting
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        xhrSetup: (xhr, url) => {
          // Ensure CORS is properly configured
          xhr.withCredentials = false;
          xhr.setRequestHeader('Accept', 'application/x-mpegURL,*/*');
        }
      });

      console.log('🎬 HLS.js: Loading source and attaching media');
      hls.loadSource(playbackUrl);
      hls.attachMedia(videoRef.current);

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
              console.log('🔄 Network error, falling back to direct source');
              if (videoRef.current) {
                videoRef.current.src = playbackUrl;
              }
              break;
            case window.Hls.ErrorTypes.MEDIA_ERROR:
              console.log('🔄 Media error, trying to recover');
              hls.recoverMediaError();
              break;
            default:
              console.log('🔄 Fatal HLS.js error, trying native browser HLS');
              setError(`HLS streaming failed: ${data.type}`);
              setIsLoading(false);
              // Final fallback to native browser HLS
              if (videoRef.current && !videoRef.current.src) {
                console.log('🔄 Final fallback to native HLS');
                videoRef.current.src = playbackUrl;
                // Force load to trigger native HLS
                setTimeout(() => {
                  if (videoRef.current) {
                    videoRef.current.load();
                  }
                }, 100);
              }
              break;
          }
        }
      });

      // Set a timeout to fallback if HLS takes too long
      const fallbackTimeout = setTimeout(() => {
        if (videoRef.current && !videoRef.current.currentSrc) {
          console.log('⏰ HLS.js timeout, falling back to native HLS');
          // Destroy HLS.js and let browser handle it natively
          hls.destroy();
          videoRef.current.src = playbackUrl;
          videoRef.current.load();
          setIsLoading(false);
        }
      }, 5000); // 5 second timeout

      return () => {
        clearTimeout(fallbackTimeout);
        if (hls) {
          hls.destroy();
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

  // Emergency fallback: if nothing works after 10 seconds, force native HLS
  useEffect(() => {
    if (playbackId && videoRef.current) {
      const emergencyTimeout = setTimeout(() => {
        if (videoRef.current && !videoRef.current.currentSrc && videoRef.current.readyState === 0) {
          console.log('🚨 EMERGENCY: Forcing native HLS after all else failed');
          videoRef.current.src = playbackUrl;
          videoRef.current.load();
          setIsLoading(false);
        }
      }, 10000); // 10 second emergency timeout

      return () => clearTimeout(emergencyTimeout);
    }
  }, [playbackId, playbackUrl]);

  // Force video source loading immediately (only if not using HLS.js)
  useEffect(() => {
    // Don't set src if we're planning to use HLS.js
    const willUseHLS = typeof window !== 'undefined' && !window.mux?.player && window.Hls;

    if (playbackId && videoRef.current && !videoRef.current.src && !willUseHLS) {
      console.log('🎯 Setting video source directly (no HLS.js):', playbackUrl);
      videoRef.current.src = playbackUrl;

      // Force a load to ensure the video element recognizes the source
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.load();
          console.log('📺 Video load() called, src:', videoRef.current.src);
        }
      }, 100);
    }
  }, [playbackId, playbackUrl]);

  // Additional fallback after scripts load
  useEffect(() => {
    if (playbackId && videoRef.current) {
      const timer = setTimeout(() => {
        if (videoRef.current && !videoRef.current.currentSrc) {
          console.log('🚨 Emergency fallback: Forcing video source');
          videoRef.current.src = playbackUrl;
          videoRef.current.load();
          setIsLoading(false);
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [playbackId, playbackUrl]);

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

      {/* Try to use Mux player if available, fallback to HTML5 video */}
      {typeof window !== 'undefined' && window.mux && window.mux.player ? (
        <mux-player
          playback-id={playbackId}
          metadata-video-id={assetId}
          metadata-video-title={title}
          poster={thumbnailUrl}
          controls={controls ? 'true' : 'false'}
          autoplay={autoplay ? 'true' : 'false'}
          muted={muted ? 'true' : 'false'}
          style={{
            width: '100%',
            height: 'auto',
            aspectRatio: '16/9',
            borderRadius: '0.5rem',
          }}
          onLoadStart={handleLoadStart}
          onCanPlay={handleCanPlay}
          onError={handleError}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
        />
      ) : (
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
          onLoadedData={() => console.log('🎥 Video loaded data')}
          onLoadedMetadata={() => console.log('🎥 Video loaded metadata')}
          onStalled={() => console.log('🎥 Video stalled')}
          onSuspend={() => console.log('🎥 Video suspended')}
          onWaiting={() => console.log('🎥 Video waiting')}
          style={{
            aspectRatio: '16/9',
            width: '100%',
            height: 'auto',
          }}
          preload="none"
        >
          <p className="text-gray-500 text-sm">
            Your browser doesn't support HTML5 video.
            <a href={playbackUrl} className="text-blue-600 underline ml-1">
              Download the video
            </a>
          </p>
        </video>
      )}
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



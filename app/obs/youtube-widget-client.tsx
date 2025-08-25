"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createEventSource } from "@/lib/fetch";

// =============================================
// TYPES & INTERFACES
// =============================================

interface YouTubeEvent {
  identifier: string;
  nickname: string;
  message: string;
  amount: number;
  createdAt: string;
  youtube_url: string;
  videoUrl?: string; // Backward compatibility
}

interface YouTubeSettings {
  maxDurationMinutes: number;
  volume: number;
  showClipTitle: boolean;
  showDonorName: boolean;
  showControls: boolean;
  minLikes: number;
  minViews: number;
  minComments: number;
  showImmediately: boolean;
}

interface YouTubeWidgetProps {
  streamerId?: string;
  token?: string;
  settings?: YouTubeSettings;
}

type ConnectionState = "connecting" | "connected" | "error" | "disconnected";
type PlayerState = "idle" | "loading" | "playing" | "error" | "ended";

// =============================================
// DEFAULT SETTINGS
// =============================================

const DEFAULT_SETTINGS: YouTubeSettings = {
  maxDurationMinutes: 5,
  volume: 50,
  showClipTitle: true,
  showDonorName: true,
  showControls: true,
  minLikes: 0,
  minViews: 0,
  minComments: 0,
  showImmediately: false
};



// =============================================
// MAIN COMPONENT
// =============================================

export function YouTubeWidgetClient({ 
  streamerId, 
  token: _token, 
  settings = DEFAULT_SETTINGS 
}: YouTubeWidgetProps) {
  
  // =============================================
  // STATE
  // =============================================
  
  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Current video state (queue is now managed by API)
  const [currentVideo, setCurrentVideo] = useState<YouTubeEvent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Player state
  const [playerState, setPlayerState] = useState<PlayerState>("idle");
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [hasPlayerError, setHasPlayerError] = useState(false);
  
  // No more localStorage - everything is synced with database via API


  
  // Player container ref
  const playerContainerRef = useRef<HTMLDivElement>(null);
  
  // Timeouts and intervals
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  
  // =============================================
  // UTILITIES
  // =============================================
  
  const extractVideoId = useCallback((url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }, []);
  
  const log = useCallback((message: string, ...args: any[]) => {
    console.log(`🎬 ${message}`, ...args);
  }, []);
  
  const logError = useCallback((message: string, ...args: any[]) => {
    console.error(`❌ ${message}`, ...args);
  }, []);

  // =============================================
  // OBS DETECTION & UTILITIES
  // =============================================
  
  const isOBSBrowser = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;

    // Check user agent for CEF or OBS
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('cef') || userAgent.includes('obs')) {
      return true;
    }

    // Check for OBS-specific properties
    // @ts-expect-error - OBS Studio API not in standard window types
    if (window.obsstudio) {
      return true;
    }

    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('obs') === 'true') {
      return true;
    }

    // Check window properties typical for CEF
    if (window.outerWidth === window.innerWidth && window.outerHeight === window.innerHeight) {
      return true;
    }

    return false;
  }, []);

  const simulateUserInteraction = useCallback(() => {
    try {
      // Create and dispatch click event
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      document.body.dispatchEvent(clickEvent);

      // Create and dispatch touch event for mobile compatibility
      const touchEvent = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true
      });
      document.body.dispatchEvent(touchEvent);

      log('🎮 Simulated user interaction for autoplay');
    } catch (error) {
      logError('Failed to simulate user interaction:', error);
    }
  }, [log, logError]);

  const enableAudioContext = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
          log('🔊 AudioContext resumed for OBS');
        }
      }
    } catch (error) {
      logError('Failed to enable AudioContext:', error);
    }
  }, [log, logError]);

  // Initialize OBS mode if detected
  useEffect(() => {
    const initOBSMode = async () => {
      const obsDetected = isOBSBrowser();
      
      if (obsDetected) {
        log("🎬 OBS Browser Source detected! Initializing OBS mode...");
        
        // Simulate user interaction for autoplay
        simulateUserInteraction();
        
        // Enable AudioContext for sound
        await enableAudioContext();
        
        // Override Page Visibility API for OBS
        try {
          Object.defineProperty(document, 'hidden', {
            get: () => false,
            configurable: true
          });
          
          Object.defineProperty(document, 'visibilityState', {
            get: () => 'visible',
            configurable: true
          });
          
          log("👁️ Overrode Visibility API for OBS");
        } catch (error) {
          logError("Failed to override Visibility API:", error);
        }
        
        // Add OBS-specific CSS class
        document.body.classList.add('obs-browser');
        
        log("✅ OBS mode fully initialized");
      }
    };
    
    initOBSMode();
  }, [isOBSBrowser, simulateUserInteraction, enableAudioContext, log, logError]);

  // Load queue from API on startup
  useEffect(() => {
    const loadQueueFromAPI = async () => {
      try {
        log("🔄 Loading queue from API on startup");
        const response = await fetch('/api/youtube/queue');
        if (response.ok) {
          const data = await response.json();
          
          // Check if there's a currently playing video
          if (data.currentlyPlaying) {
            log("🔄 Found currently playing video:", data.currentlyPlaying.identifier);
            setCurrentVideo(data.currentlyPlaying);
            setVideoTitle(`Video from ${data.currentlyPlaying.nickname}`);
          } else {
            log("🔄 No currently playing video, will check for pending videos");
          }
        } else {
          logError("Failed to load queue from API:", response.status);
        }
      } catch (error) {
        logError("Error loading queue from API:", error);
      }
    };
    
    loadQueueFromAPI();
  }, [log, logError]);
  

  

  
  // =============================================
  // CODEPEN PROXY METHOD (ONLY METHOD)
  // =============================================
  
  const createCodePenPlayer = useCallback((videoId: string) => {
    log(`Creating CodePen proxy player for video: ${videoId} (OBS mode: ${isOBSBrowser()})`);
    
    if (!playerContainerRef.current) {
      logError("Player container not available");
      return;
    }
    
    // Clear existing content
    playerContainerRef.current.innerHTML = '';

    // Check if we're in OBS mode for special handling
    const obsMode = isOBSBrowser();

    // Create iframe using CodePen proxy to bypass YouTube restrictions
    const iframe = document.createElement('iframe');
    const params = new URLSearchParams({
      v: videoId,
      autoplay: '1',
      controls: settings.showControls ? '1' : '0',
      disablekb: '1',
      fs: '0',
      iv_load_policy: '3',
      modestbranding: '1',
      playsinline: '1',
      rel: '0',
      showinfo: '0',
      start: '0',
      mute: '0', // Don't mute, we want audio
      // Audio track preferences - force original audio
      hl: 'und', // Undefined language to avoid auto-translation
      cc_lang_pref: 'und', // Prefer undefined/original captions
      cc_load_policy: '0', // Don't auto-load captions
      // Additional parameters for OBS compatibility
      ...(obsMode && {
        origin: window.location.origin,
        widget_referrer: window.location.origin,
        html5: '1',
        wmode: 'opaque'
      })
    });

    iframe.src = `https://cdpn.io/pen/debug/oNPzxKo?${params.toString()}`;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.style.border = 'none';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    
    // Enhanced iframe attributes for OBS
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = !obsMode; // Disable fullscreen in OBS
    
    if (obsMode) {
      // Additional attributes for OBS/CEF compatibility
      iframe.setAttribute('loading', 'eager');
      iframe.setAttribute('importance', 'high');
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-forms');
    }

    // Add error handling
    iframe.onerror = () => {
      logError("CodePen proxy failed to load");
      handleVideoBlockedCompletely(videoId);
    };

    iframe.onload = () => {
      log("CodePen proxy loaded successfully");
      setPlayerState("playing");
      setIsPlayerReady(true);
      setIsPlaying(true);
      scheduleVideoEnd();
      
      // Additional user interaction simulation for OBS after iframe loads
      if (obsMode) {
        setTimeout(() => {
          simulateUserInteraction();
          log("🎮 Additional user interaction simulated for OBS after iframe load");
        }, 500);
      }
    };

    playerContainerRef.current.appendChild(iframe);
  }, [settings, isOBSBrowser, simulateUserInteraction, log, logError]);



  // =============================================
  // ERROR HANDLING
  // =============================================
  
  const handleVideoError = useCallback((videoId: string, error?: any) => {
    log(`🔄 Handling video error for: ${videoId}`, error);
    
    setHasPlayerError(true);
    setPlayerState("error");
    
    // Try CodePen proxy method first (best for bypassing restrictions)
    setTimeout(() => {
      createCodePenPlayer(videoId);
    }, 1000);
  }, [log, createCodePenPlayer]);

  const handleVideoBlockedCompletely = useCallback((videoId: string) => {
    log(`🚫 Video completely blocked: ${videoId}`);
    
    if (!playerContainerRef.current) return;

    // Show message and link to open in YouTube
    playerContainerRef.current.innerHTML = `
      <div style="
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #ff0000, #cc0000);
        color: white;
        text-align: center;
        font-family: Arial, sans-serif;
        padding: 20px;
        box-sizing: border-box;
      ">
        <div style="font-size: 2rem; margin-bottom: 10px;">🚫</div>
        <div style="font-size: 1.2rem; margin-bottom: 10px;">Відео не може бути відтворене</div>
        <div style="font-size: 0.9rem; margin-bottom: 20px; opacity: 0.9;">
          Власник заборонив вбудовування
        </div>
        <a 
          href="https://www.youtube.com/watch?v=${videoId}" 
          target="_blank" 
          rel="noopener noreferrer"
          style="
            background: white;
            color: #ff0000;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            transition: all 0.3s ease;
          "
          onmouseover="this.style.background='#f0f0f0'"
          onmouseout="this.style.background='white'"
        >
          Відкрити на YouTube
        </a>
      </div>
    `;
    
    setPlayerState("error");
    setIsPlaying(false);
    
    // Auto finish after showing message
    setTimeout(() => {
      finishVideo();
      // Start next video in queue
      setTimeout(() => processQueue(), 600);
    }, 5000);
  }, [log]);

  // =============================================
  // VIDEO LIFECYCLE
  // =============================================
  
  const scheduleVideoEnd = useCallback(() => {
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
    }
    
    const duration = settings.maxDurationMinutes * 60 * 1000;
    log(`Scheduling video end in ${duration}ms`);
    
    finishTimeoutRef.current = setTimeout(() => {
      log("Video duration limit reached - finishing");
      finishVideo();
      // Start next video in queue
      setTimeout(() => processQueue(), 600);
    }, duration);
  }, [settings.maxDurationMinutes, log]);
  
  const finishVideo = useCallback(async () => {
    log("🛑 Finishing current video");
    log("🛑 Current video before finish:", currentVideo ? `${currentVideo.identifier} (${currentVideo.nickname})` : "none");
    
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }

    // Update status in database if we have a current video
    if (currentVideo) {
      try {
        await fetch('/api/youtube/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: currentVideo.identifier,
            status: 'completed'
          })
        });
        log("🛑 Updated video status to completed in database:", currentVideo.identifier);
      } catch (error) {
        logError("Failed to update video status in database:", error);
      }
    }
    
    log("🛑 Clearing currentVideo and player state");
    setCurrentVideo(null);
    setPlayerState("idle");
    setIsPlaying(false);
    setIsPlayerReady(false);
    setHasPlayerError(false);
    setVideoTitle("");
    
    // Clear player container (stops CodePen iframe)
    if (playerContainerRef.current) {
      playerContainerRef.current.innerHTML = '';
    }
    
    log("🛑 Video finished - ready for next video");
  }, [log, logError, currentVideo]);
    
  // =============================================
  // VIDEO VALIDATION
  // =============================================
  
  const validateVideo = useCallback(async (videoId: string): Promise<boolean> => {
    try {
      log(`Validating video: ${videoId}`);
      
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      
      if (!response.ok) {
        logError(`Video validation failed: ${response.status}`);
        return false;
      }
      
      const data = await response.json();
      log(`Video validation successful: ${data.title}`);
      return true;
    } catch (error) {
      logError("Video validation error:", error);
      return false;
    }
  }, [log, logError]);

  // =============================================
  // QUEUE MANAGEMENT
  // =============================================
  
  const processQueue = useCallback(async () => {
    log(`🔄 processQueue called - Processing: ${isProcessingRef.current}, CurrentVideo: ${!!currentVideo}`);

    if (isProcessingRef.current) {
      log("🔄 Already processing, skipping");
      return;
    }

    if (currentVideo) {
      log("🔄 Video currently playing, skipping");
      return;
    }

    log("🎬 Getting next video from API queue");
    isProcessingRef.current = true;

    try {
      // Get next video from API
      const response = await fetch('/api/youtube/queue', {
        method: 'PATCH'
      });

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.nextVideo) {
        log("🔄 No videos in queue");
        isProcessingRef.current = false;
        return;
      }

      const nextVideo = data.nextVideo;
      const videoUrl = nextVideo.youtube_url;

      if (!videoUrl) {
        logError("No video URL for next item:", nextVideo);
        isProcessingRef.current = false;
        return;
      }

      const videoId = extractVideoId(videoUrl);
      if (!videoId) {
        logError("Could not extract video ID from:", videoUrl);
        isProcessingRef.current = false;
        return;
      }
      
      log(`🎬 PLAYING: ${videoId} from ${nextVideo.nickname}`);
      log(`🎬 SETTING currentVideo:`, {
        identifier: nextVideo.identifier,
        nickname: nextVideo.nickname,
        videoUrl: videoUrl
      });
      
      setCurrentVideo(nextVideo);
      setVideoTitle(`Video from ${nextVideo.nickname}`);
      
      // Always use CodePen proxy player
      try {
        await validateVideo(videoId);
        log("🎬 Using CodePen proxy player");
        createCodePenPlayer(videoId);
      } catch (error) {
        logError("Video validation failed or player creation error:", error);
        setHasPlayerError(true);
        // Automatically finish this video if there's an error to move to the next
        setTimeout(() => finishVideo(), 2000);
      }
    } catch (error) {
      logError("Failed to get next video from API:", error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [isProcessingRef, currentVideo, log, logError, extractVideoId, validateVideo, createCodePenPlayer, finishVideo]);
  
  // Video validation is now above processQueue
  
  // =============================================
  // SERVER-SENT EVENTS
  // =============================================
  
  const connectSSE = useCallback(() => {
    if (!streamerId) {
      logError("No streamer ID provided");
      return;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionState("connecting");
    log(`Connecting to SSE for streamer: ${streamerId}`);
    
    try {
      const eventSource = createEventSource(`/api/stream?streamerId=${streamerId}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        log("SSE connection opened");
        setConnectionState("connected");

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      eventSource.onerror = (error) => {
        logError("SSE connection error:", error);
        setConnectionState("error");
        
        eventSource.close();
        
        if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
            log("Attempting to reconnect...");
          connectSSE();
          }, 5000);
        }
      };
      
      // НЕ слухаємо SSE події автоматично - чекаємо сигнал від donation widget'у
      log("🎬 YouTube widget ready, waiting for signals from donation widget");

    } catch (error) {
      logError("Failed to create SSE connection:", error);
      setConnectionState("error");
    }
  }, [streamerId, log, logError]);
  
  // =============================================
  // EFFECTS
  // =============================================
  
  // Connect to SSE when component mounts
  useEffect(() => {
    if (streamerId) {
      connectSSE();
    }
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [streamerId, connectSSE]);
  
  // Listen for signals from donation widget
  useEffect(() => {
    log("🎬 YouTube widget initialized, setting up signal listeners");
    


    // Simple function to check for existing signal on mount
    const checkExistingSignal = () => {
      try {
        const existingSignal = localStorage.getItem('kitsune-youtube-signal');
        if (existingSignal) {
          const signal = JSON.parse(existingSignal);
          if (signal.action === 'START_VIDEO' && signal.videoData) {
            log("🎬 FOUND existing signal on startup");
            handleStorageChange({ key: 'kitsune-youtube-signal', newValue: existingSignal } as StorageEvent);
          }
        }
      } catch (error) {
        logError("Error checking existing signal:", error);
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'kitsune-youtube-signal' && event.newValue) {
        try {
          const signal = JSON.parse(event.newValue);
          
          if (signal.action === 'START_VIDEO' && signal.videoData) {
            log("🎬 RECEIVED YouTube signal:", signal.videoData.youtube_url);
            
            // Add video to queue immediately
            const youtubeEvent: YouTubeEvent = {
              identifier: signal.videoData.identifier,
              nickname: signal.videoData.nickname,
              message: signal.videoData.message,
              amount: signal.videoData.amount,
              createdAt: signal.videoData.createdAt,
              youtube_url: signal.videoData.youtube_url,
              videoUrl: signal.videoData.youtube_url
            };
            
            // Video will be picked up by the API polling system
            log("🎬 Video signal received - will be processed by API polling");
            
            // Clear signal
            localStorage.removeItem('kitsune-youtube-signal');
          }
        } catch (error) {
          logError("YouTube signal parse error:", error);
        }
      }
    };
    
    // Check for existing signal on mount
    checkExistingSignal();
    
    // Just listen for SSE signals - no more localStorage control
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [streamerId, log, logError]);
  
  // Poll API for queue changes and sync status
  useEffect(() => {
    const checkQueueAndSync = async () => {
      try {
        const response = await fetch('/api/youtube/queue');
        if (response.ok) {
          const data = await response.json();
          
          // Check if our current video status needs to be updated
          if (currentVideo) {
            const currentVideoInAPI = data.queue.find((v: any) => v.identifier === currentVideo.identifier);
            if (currentVideoInAPI && currentVideoInAPI.status === 'completed') {
              log("🔄 Current video marked as completed in API, finishing...");
              await finishVideo();
              return;
            }
          }
          
          // If no video is playing and there are pending videos, start the next one
          if (!currentVideo && data.queue.some((v: any) => v.status === 'pending')) {
            log("🔄 Found pending videos, processing queue...");
            await processQueue();
          }
        }
      } catch (error) {
        logError("Error checking queue sync:", error);
      }
    };

    // Check immediately
    checkQueueAndSync();
    
    // Then check every 3 seconds for real-time sync
    const interval = setInterval(checkQueueAndSync, 3000);
    
    return () => clearInterval(interval);
  }, [currentVideo, processQueue, finishVideo, log, logError]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
      }
      // CodePen iframe cleanup happens automatically when component unmounts
    };
  }, []);
  
  // =============================================
  // RENDER
  // =============================================

  return (
    <div className="youtube-widget" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'transparent',
      pointerEvents: 'none',
      zIndex: 1000
    }}>
      


            {/* OBS Debug Indicator (only when OBS is detected and debug=true in URL) */}
      {isOBSBrowser() && new URLSearchParams(window.location.search).get('debug') === 'true' && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: '#00ff00',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 2000,
          border: '1px solid #00ff00'
        }}>
          🎬 OBS MODE ACTIVE
        </div>
      )}

      {/* Video Title and Donor Name - Above Player */}
      {currentVideo && (settings.showClipTitle || settings.showDonorName) && (
        <div style={{
          position: 'absolute',
          top: 'calc(50% - 285px)', // Above player with proper gap
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          maxWidth: '90vw',
          textAlign: 'center',
          zIndex: 1003
        }}>
          {settings.showDonorName && (
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#ff6b6b',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}>
              {currentVideo.nickname} • {currentVideo.amount}₴
        </div>
      )}
              {settings.showClipTitle && videoTitle && (
            <div style={{
              fontSize: '18px',
              fontWeight: '500',
              color: 'white',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}>
                  {videoTitle}
                </div>
              )}
                </div>
              )}

      {/* Video Player Container */}
      {currentVideo && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '450px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          background: '#000',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '2px solid #ff6b6b',
          boxShadow: '0 0 30px rgba(255, 107, 107, 0.3), 0 20px 40px rgba(0,0,0,0.4)',
          pointerEvents: 'auto',
          zIndex: 1002
        }}>
          
          {/* Player Container */}
          <div 
            ref={playerContainerRef}
                        style={{
              width: '100%',
              height: '100%',
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {!isPlayerReady && playerState === "loading" && (
              <div style={{
                color: 'white',
                textAlign: 'center',
                fontFamily: 'Arial, sans-serif'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
                <div>Завантаження відео...</div>
                    </div>
                  )}
          </div>
        </div>
      )}
    </div>
  );
}
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
  showControls: boolean; // Додано для donatello.to підходу
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
  volume: 5, // 🎯 donatello.to використовує менші значення (потім * 10)
  showClipTitle: true,
  showDonorName: true,
  showControls: true, // 🎯 donatello.to завжди показує controls
  minLikes: 0,
  minViews: 0,
  minComments: 0,
  showImmediately: false
};

// =============================================
// DONATELLO.TO APPROACH - MINIMAL YOUTUBE SETUP
// =============================================

// =============================================
// MAIN COMPONENT
// =============================================

export function YouTubeWidgetClient({ 
  streamerId, 
  token, 
  settings = DEFAULT_SETTINGS 
}: YouTubeWidgetProps) {
  
  // =============================================
  // STATE
  // =============================================
  
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [playerState, setPlayerState] = useState<PlayerState>("idle");
  const [currentVideo, setCurrentVideo] = useState<YouTubeEvent | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [debugMode, setDebugMode] = useState(false);
  const [youtubeApiReady, setYoutubeApiReady] = useState(false);
  
  // =============================================
  // REFS
  // =============================================
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const playerRef = useRef<any>(null);
  const videoQueueRef = useRef<YouTubeEvent[]>([]);
  const videoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
  // YOUTUBE API MANAGEMENT
  // =============================================
  
  useEffect(() => {
    log("Loading YouTube IFrame API...");
    
    // Check if API is already loaded
    if ((window as any).YT?.Player) {
      log("YouTube API already available");
      setYoutubeApiReady(true);
      return;
    }
    
    // Check if script exists
    const scriptExists = document.querySelector('script[src*="youtube.com/player_api"]');
    if (scriptExists) {
      log("YouTube API script exists, waiting...");
      const checkApi = setInterval(() => {
        if ((window as any).YT?.Player) {
          log("YouTube API ready from existing script");
          setYoutubeApiReady(true);
          clearInterval(checkApi);
        }
      }, 100);
      
      return () => clearInterval(checkApi);
    }
    
    // Load the script
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/player_api';
    script.async = true;
    
    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
    
    // 🎯 Використовуємо callback як donatello.to
    const originalCallback = (window as any).onYouTubePlayerAPIReady;
    (window as any).onYouTubePlayerAPIReady = () => {
      log("🎬 YouTube Player API ready (donatello.to style)");
      setYoutubeApiReady(true);
      
      if (originalCallback && typeof originalCallback === 'function') {
        originalCallback();
      }
    };

    return () => {
      // Cleanup callback
      if ((window as any).onYouTubePlayerAPIReady) {
        delete (window as any).onYouTubePlayerAPIReady;
      }
    };
  }, [log]);
  
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
      const title = data.title || "Unknown Video";
      setVideoTitle(title);
      
      log(`Video validated: "${title}"`);
      return true;
    } catch (error) {
      logError("Video validation error:", error);
      setVideoTitle("YouTube Video");
      return true; // Continue anyway
    }
  }, [log, logError]);
  
  // =============================================
  // PLAYER MANAGEMENT
  // =============================================
  
  const clearPlayer = useCallback(() => {
    log("Clearing player");
    
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (err) {
        logError("Error destroying player:", err);
      }
      playerRef.current = null;
    }
    
    const container = document.getElementById('youtube-player');
    if (container) {
      container.innerHTML = '';
    }
  }, [log, logError]);
  
  const createYouTubePlayer = useCallback(async (videoId: string): Promise<boolean> => {
    if (!youtubeApiReady) {
      logError("❌ YouTube API not ready");
      return false;
    }
    
    // ✅ Перевіряємо чи глобальний YT об'єкт доступний
    if (!window.YT || !window.YT.Player) {
      logError("❌ YouTube Player not available");
      return false;
    }
    
    log(`🎬 Creating YouTube player (donatello.to style) for: ${videoId}`);
    
    // Clear existing player
    clearPlayer();
    
    // Wait for DOM
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Find container
    const container = document.getElementById('youtube-player');
    if (!container) {
      logError("Player container not found");
      return false;
    }
    
    try {
              // 🎯 Створюємо плеєр точно як donatello.to
      playerRef.current = new (window as any).YT.Player('youtube-player', {
        height: '540', // Використовуємо їх розміри
        width: '720',
        videoId: videoId,
        playerVars: {
          'autoplay': 1,
          'controls': 1, // 🎯 Завжди показуємо controls як donatello.to
          'start': 0
        },
          events: {
                      onReady: (event: any) => {
            log("✅ Player ready, setting volume (donatello.to style)");
            // 🎯 Використовуємо формулу donatello.to: volume * 10
            const volume = Math.max(0, Math.min(100, settings.volume * 10));
            event.target.setVolume(volume);
            setPlayerState("playing");
          },
            onStateChange: (event: any) => {
              const state = event.data;
                          if (state === 0) { // Ended
              log("Video ended");
              setPlayerState("ended");
              setCurrentVideo(null);
              setPlayerState("idle");
            } else if (state === 1) { // Playing
              setPlayerState("playing");
            } else if (state === 2) { // Paused
              setPlayerState("loading");
              }
            },
            onError: (event: any) => {
            const errorCode = event.data;
            logError(`Player error: ${errorCode}`);
            setPlayerState("error");
            
            // Тільки якщо це дійсно copyright error
            if (errorCode === 150) {
              logError("❌ Video blocked by copyright - trying fallback");
              createSimpleFallback(videoId);
            } else {
              logError(`❌ Player error ${errorCode}, finishing video`);
              setPlayerState("ended");
              setCurrentVideo(null);
              setPlayerState("idle");
            }
            }
          }
        });
      
      log("✅ YouTube player created successfully");
      return true;
    } catch (error) {
      logError("❌ Failed to create player:", error);
      return false;
    }
  }, [youtubeApiReady, settings.volume, settings.showControls, log, logError, clearPlayer]);
  
  // 🎯 Простий fallback без складних обходів (як у donatello.to)
  const createSimpleFallback = useCallback((videoId: string) => {
    log(`🔄 Creating simple fallback for: ${videoId}`);
    
    const container = document.getElementById('youtube-player');
    if (!container) {
      logError("Container not found for fallback");
      return;
    }
    
    // Показуємо повідомлення користувачу
    container.innerHTML = `
      <div style="
        width: 100%; 
        height: 100%; 
        background: black; 
        color: white; 
        display: flex; 
        flex-direction: column;
        align-items: center; 
        justify-content: center; 
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <div style="font-size: 24px; margin-bottom: 10px;">🚫</div>
        <div style="font-size: 16px; margin-bottom: 10px;">Відео заблоковано</div>
        <div style="font-size: 12px; color: #999;">
          Це відео не дозволено для вбудовування<br/>
          через авторські права
        </div>
      </div>
    `;
    
    log("❌ Fallback message displayed for blocked video");
    setPlayerState("error");
    
    // Автоматично завершуємо через 3 секунди
    setTimeout(() => {
      log("🏁 Auto-finishing blocked video");
      setPlayerState("idle");
      setCurrentVideo(null);
      setPlayerState("idle");
    }, 3000);
  }, [log, logError]);
  
  // =============================================
  // VIDEO LIFECYCLE
  // =============================================
  
  const startVideo = useCallback(async (video: YouTubeEvent) => {
    if (isProcessingRef.current) {
      log("Already processing, ignoring");
      return;
    }
    
    log("Starting video:", { nickname: video.nickname, amount: video.amount });
    
    isProcessingRef.current = true;
    setCurrentVideo(video);
    setPlayerState("loading");
    
    const videoUrl = video.youtube_url || video.videoUrl;
    if (!videoUrl) {
      logError("No video URL provided");
      finishVideo();
      return;
    }
    
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      logError("Invalid video URL:", videoUrl);
      finishVideo();
      return;
    }
    
    // Validate video
    await validateVideo(videoId);
    
    // Create player
    const success = await createYouTubePlayer(videoId);
    if (!success) {
      log("❌ Failed to create YouTube player, trying retry...");
      
      // Retry після короткої затримки
      setTimeout(async () => {
        const retrySuccess = await createYouTubePlayer(videoId);
        if (!retrySuccess) {
          log("❌ Retry failed, showing fallback");
          createSimpleFallback(videoId);
        }
      }, 1000);
      return;
    }
    
    // Set timer
    const timeLimit = settings.maxDurationMinutes * 60 * 1000;
    videoTimeoutRef.current = setTimeout(() => {
      log("Video time limit reached");
      finishVideo();
    }, timeLimit);
    
  }, [log, logError, extractVideoId, validateVideo, createYouTubePlayer, createSimpleFallback, settings.maxDurationMinutes]);
  
  const finishVideo = useCallback(() => {
    log("Finishing video");
    
    // Clear timeout
      if (videoTimeoutRef.current) {
        clearTimeout(videoTimeoutRef.current);
      videoTimeoutRef.current = null;
    }
    
    // Clear player
    clearPlayer();
    
    // Reset state
    setCurrentVideo(null);
    setVideoTitle("");
    setPlayerState("idle");
    isProcessingRef.current = false;
    
    // Process next video after delay
    setTimeout(() => {
      processQueue();
    }, 2000);
    
  }, [log, clearPlayer]);
  
  const processQueue = useCallback(() => {
    if (isProcessingRef.current) {
      return;
    }
    
    const nextVideo = videoQueueRef.current.shift();
    if (nextVideo) {
      log("Processing next video from queue");
      startVideo(nextVideo);
    } else {
      log("Queue empty");
    }
  }, [startVideo, log]);
  
  const enqueueVideo = useCallback((video: YouTubeEvent) => {
    log("Adding video to queue:", { nickname: video.nickname, amount: video.amount });
    videoQueueRef.current.push(video);
    
    if (!isProcessingRef.current) {
      processQueue();
    }
  }, [log, processQueue]);
  
  // =============================================
  // SSE CONNECTION
  // =============================================
  
  const connectSSE = useCallback(() => {
    // Перевіряємо стан існуючого з'єднання
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      log("SSE already connected and active");
      setConnectionState("connected");
      return;
    }
    
    // Закриваємо тільки якщо з'єднання не активне
    if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.CLOSED) {
      log("Closing existing SSE connection");
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionState("connecting");
    
    const streamParam = streamerId ? `&streamerId=${encodeURIComponent(streamerId)}` : '';
    const url = `/api/stream?ts=${Date.now()}${streamParam}`;
    
    log("Connecting to SSE:", url);
    
    try {
      const eventSource = createEventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        log("SSE Connected");
        setConnectionState("connected");
      };

      eventSource.onerror = (error) => {
        logError("SSE Error:", error);
        setConnectionState("error");
        
        // Reconnect after delay
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          log("Reconnecting SSE...");
          connectSSE();
        }, 3000);
      };

      eventSource.addEventListener("youtube-video", (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          log("Received YouTube event:", payload);
          
          // Перевіряємо всі можливі поля для URL
          const videoUrl = payload.youtube_url || payload.videoUrl || payload.youtubeUrl || payload.url;
          
          if (!videoUrl) {
            logError("No video URL in payload. Available fields:", Object.keys(payload));
            return;
          }
          
          // Створюємо правильний event object
          const youtubeEvent: YouTubeEvent = {
            identifier: payload.identifier || "unknown-" + Date.now(),
            nickname: payload.nickname || "Unknown User",
            message: payload.message || "",
            amount: payload.amount || 0,
            createdAt: payload.createdAt || new Date().toISOString(),
            youtube_url: videoUrl,
            videoUrl: videoUrl
          };
          
          log("Processed event:", { nickname: youtubeEvent.nickname, amount: youtubeEvent.amount, url: videoUrl });
          enqueueVideo(youtubeEvent);
        } catch (err) {
          logError("Failed to parse YouTube event:", err);
        }
      });

      eventSource.addEventListener("ping", (event: MessageEvent) => {
        if (debugMode) log("Ping received:", event.data);
      });

    } catch (error) {
      logError("Failed to create EventSource:", error);
      setConnectionState("error");
    }
  }, [streamerId, log, logError, enqueueVideo, debugMode]);
  
  // =============================================
  // INITIALIZATION
  // =============================================
  
  useEffect(() => {
    // Read debug mode from URL
    const url = new URL(window.location.href);
    setDebugMode(url.searchParams.get("debug") === "true");
    
    log("YouTube Widget initialized");
  }, [log]);
  
  useEffect(() => {
    // Тільки ініціалізуємо SSE якщо його ще немає
    if (!eventSourceRef.current) {
      log("Initializing SSE connection");
    connectSSE();
    } else {
      log("SSE already exists, keeping connection");
    }
    
    return () => {
      // В development режимі не закриваємо з'єднання через Fast Refresh
      if (process.env.NODE_ENV === 'production') {
        log("Production cleanup - closing SSE connection");
        
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
          eventSourceRef.current = null;
      }
        
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
      }
        
      if (videoTimeoutRef.current) {
        clearTimeout(videoTimeoutRef.current);
          videoTimeoutRef.current = null;
        }
        
        clearPlayer();
      } else {
        log("Development mode - preserving connections");
      }
    };
  }, []); // Без залежностей для стабільності
  
  // =============================================
  // RENDER
  // =============================================

  return (
    <div className="pointer-events-none fixed inset-0 select-none" suppressHydrationWarning>
      {/* Debug Panel */}
      {debugMode && (
        <div className="pointer-events-auto fixed top-4 left-4 z-50 bg-black/90 text-white p-4 rounded text-sm max-w-xs space-y-2">
          <div><strong>🎬 YouTube Debug</strong></div>
          <div>Connection: <span className={connectionState === 'connected' ? 'text-green-400' : 'text-red-400'}>{connectionState}</span></div>
          <div>API Ready: <span className={youtubeApiReady ? 'text-green-400' : 'text-red-400'}>{youtubeApiReady ? "Yes" : "No"}</span></div>
          <div>Player: <span className={playerState === 'playing' ? 'text-green-400' : 'text-yellow-400'}>{playerState}</span></div>
          <div>Queue: {videoQueueRef.current.length}</div>
          <div>Current: {currentVideo?.nickname || "None"}</div>
          
          <button
            onClick={() => {
              log("Manual test - Testing Rick Roll");
              enqueueVideo({
                identifier: "test-" + Date.now(),
                nickname: "TestUser",
                message: "Manual test video",
                amount: 100,
                createdAt: new Date().toISOString(),
                youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              });
            }}
            className="w-full bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
          >
            🧪 Test Video
          </button>
          
          <button
            onClick={() => {
              log("Manual SSE reconnect");
              if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
              }
              connectSSE();
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
          >
            🔄 Force Reconnect
          </button>
          
          <button
            onClick={() => {
              log("Current state debug:");
              console.log("EventSource:", eventSourceRef.current);
              console.log("Queue:", videoQueueRef.current);
              console.log("Current video:", currentVideo);
              console.log("Player state:", playerState);
            }}
            className="w-full bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-xs"
          >
            🐛 Debug State
          </button>
        </div>
      )}

      {/* Video Widget */}
      {currentVideo && playerState !== "idle" && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-[9999] bg-black/90 rounded-lg overflow-hidden">
          <div style={{ width: '720px' }}>
            {/* Video Info - мінімальні відступи */}
            <div className="px-4 pt-2 text-white text-center">
              {settings.showClipTitle && videoTitle && (
                <div className="text-sm font-medium truncate leading-tight">
                  {videoTitle}
                </div>
              )}
              
              {settings.showDonorName && currentVideo && (
                <div className="text-xs text-gray-300 leading-tight">
                  {currentVideo.nickname}
                </div>
              )}
            </div>
            
                    {/* YouTube Player Container - без відступу зверху */}
        <div className="w-full" style={{ height: '540px' }}>
          <div 
            id="youtube-player" 
            className="w-full h-full bg-black border-2 border-gray-400"
          />
          </div>
          </div>
        </div>
      )}
      
      {/* Animate.css for animations */}
      <link 
        rel="stylesheet" 
        href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
        crossOrigin="anonymous"
      />
    </div>
  );
}
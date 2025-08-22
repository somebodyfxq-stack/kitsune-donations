"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createEventSource } from "@/lib/fetch";
import dynamic from "next/dynamic";

// Динамічний імпорт react-player для оптимізації
const ReactPlayer = dynamic(() => import("react-player"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
        <p className="text-sm">Завантаження плеєра...</p>
      </div>
    </div>
  ),
}) as any;

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
  volume: 80, // react-player використовує значення 0-100
  showClipTitle: true,
  showDonorName: true,
  showControls: true, // Завжди показувати контроли
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
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [hasPlayerError, setHasPlayerError] = useState(false);
  
  // =============================================
  // REFS
  // =============================================
  
  const eventSourceRef = useRef<EventSource | null>(null);
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
  // REACT-PLAYER BASED VIDEO MANAGEMENT
  // =============================================
  
  // react-player не потребує окремого завантаження API
  // Всі операції виконуються через компонент
  
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
    log("Clearing ReactPlayer");
    
    // react-player cleanup відбувається автоматично через React lifecycle
    setPlayerState("idle");
    setIsPlayerReady(false);
    setHasPlayerError(false);
    setCurrentVideo(null);
    setVideoTitle("");
  }, [log]);
  
    // Fallback для заблокованих відео
  const handleVideoError = useCallback((videoId: string, error?: any) => {
    log(`🔄 Handling video error for: ${videoId}`, error);
    
    setHasPlayerError(true);
    setPlayerState("error");
    
    // Автоматичне завершення буде оброблено через useEffect
  }, [log]);

  const createReactPlayer = useCallback(async (videoId: string): Promise<boolean> => {
    log(`🎬 Creating ReactPlayer for video: ${videoId}`);
    
    try {
              setPlayerState("loading");
      setIsPlayerReady(false);
      setHasPlayerError(false);
      
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      log(`📺 Video URL: ${videoUrl}`);
      log(`🎛️ Settings:`, {
        volume: settings.volume,
        showControls: settings.showControls,
        maxDuration: settings.maxDurationMinutes
      });
      
      // Додаємо timeout для випадку, коли відео довго не завантажується
      setTimeout(() => {
        logError("⏰ Video loading timeout - forcing skip");
        setHasPlayerError(true);
        setPlayerState("error");
      }, 15000); // 15 секунд timeout
      
      return true;
    } catch (error) {
      logError("❌ Failed to prepare ReactPlayer:", error);
      setHasPlayerError(true);
      setPlayerState("error");
      return false;
    }
  }, [log, logError, settings]);
  
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
    const success = await createReactPlayer(videoId);
    if (!success) {
      log("❌ Failed to prepare ReactPlayer");
      handleVideoError(videoId, "Failed to prepare player");
      return;
    }
    
    // Set timer
    const timeLimit = settings.maxDurationMinutes * 60 * 1000;
    videoTimeoutRef.current = setTimeout(() => {
      log("Video time limit reached");
      finishVideo();
    }, timeLimit);
    
  }, [log, logError, extractVideoId, validateVideo, createReactPlayer, handleVideoError, settings.maxDurationMinutes]);
  
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
    const isDebug = url.searchParams.get("debug") === "true";
    setDebugMode(isDebug);
    
    log("YouTube Widget initialized with settings:", settings);
    if (isDebug) {
      log("🔧 Debug mode enabled");
      log("📋 Settings breakdown:", {
        volume: settings.volume,
        showControls: settings.showControls,
        showClipTitle: settings.showClipTitle,
        showDonorName: settings.showDonorName,
        maxDurationMinutes: settings.maxDurationMinutes
      });
    }
  }, [log, settings]);

  // Debug для стану компонента
  useEffect(() => {
    if (debugMode) {
      log("🔄 State change:", {
        playerState,
        isPlayerReady,
        hasPlayerError,
        currentVideo: currentVideo ? {
          nickname: currentVideo.nickname,
          videoUrl: currentVideo.youtube_url || currentVideo.videoUrl
        } : null
      });
    }
  }, [debugMode, playerState, isPlayerReady, hasPlayerError, currentVideo, log]);

  // Автоматичне завершення відео при помилці
  useEffect(() => {
    if (hasPlayerError && currentVideo) {
      log("🔄 Video error detected, auto-finishing in 3 seconds");
      const timeout = setTimeout(() => {
        log("🏁 Auto-finishing error video");
        finishVideo();
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [hasPlayerError, currentVideo, finishVideo, log]);
  
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
          <div><strong>🎬 YouTube Debug (ReactPlayer)</strong></div>
          <div>Connection: <span className={connectionState === 'connected' ? 'text-green-400' : 'text-red-400'}>{connectionState}</span></div>
          <div>Player Ready: <span className={isPlayerReady ? 'text-green-400' : 'text-red-400'}>{isPlayerReady ? "Yes" : "No"}</span></div>
          <div>Player Error: <span className={hasPlayerError ? 'text-red-400' : 'text-green-400'}>{hasPlayerError ? "Yes" : "No"}</span></div>
          <div>Player: <span className={playerState === 'playing' ? 'text-green-400' : 'text-yellow-400'}>{playerState}</span></div>
          <div>Queue: {videoQueueRef.current.length}</div>
          <div>Current: {currentVideo?.nickname || "None"}</div>
          {currentVideo && (
            <div className="text-xs opacity-75">
              VideoID: {extractVideoId(currentVideo.youtube_url || currentVideo.videoUrl || '')}
            </div>
          )}
          
          <button
            onClick={() => {
              log("Manual test - Testing Rick Roll");
              enqueueVideo({
                identifier: "test-" + Date.now(),
                nickname: "TestUser",
                message: "Manual test video",
                amount: 100,
                createdAt: new Date().toISOString(),
                youtube_url: "https://www.youtube.com/watch?v=sTKEC5gEQmA"
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
            {/* Video Info */}
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
            
            {/* ReactPlayer Container */}
        <div className="w-full" style={{ height: '540px' }}>
              {hasPlayerError ? (
                <div className="w-full h-full flex items-center justify-center bg-black text-white border-2 border-red-500">
                  <div className="text-center space-y-4">
                    <div className="text-red-400 text-4xl">⚠️</div>
                    <div>
                      <p className="text-lg font-semibold">Відео недоступне для відтворення</p>
                      <p className="text-sm opacity-75 mt-1">
                        Можливо відео приватне або заблоковане
                      </p>
                    </div>
                  </div>
                </div>
              ) : playerState === "loading" ? (
                <div className="w-full h-full flex items-center justify-center bg-black text-white border-2 border-blue-500">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                    <div>
                      <p className="text-lg font-semibold">Завантаження відео...</p>
                      <p className="text-sm opacity-75 mt-1">
                        {videoTitle || "Підготовка плеєра"}
                      </p>
                      {debugMode && (
                        <p className="text-xs opacity-50 mt-2">
                          PlayerState: {playerState}, Ready: {isPlayerReady ? "Yes" : "No"}
                        </p>
                      )}
                      <button 
                        className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm"
                        onClick={() => {
                          log("🔄 Manual skip requested during loading");
                          finishVideo();
                        }}
                      >
                        Пропустити відео
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  {(() => {
                    const videoId = extractVideoId(currentVideo.youtube_url || currentVideo.videoUrl || '');
                    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    
                    log(`🔍 Processing video: ID=${videoId}, URL=${videoUrl}`);
                    log(`⚙️ Player props:`, {
                      url: videoUrl,
                      playing: true,
                      controls: settings.showControls,
                      volume: settings.volume / 100,
                      muted: true
                    });
                    
                    return (
                      <ReactPlayer
                        key={videoId} // Додаємо key для форсування ре-рендеру
                        url={videoUrl}
                        playing={true}
                        controls={settings.showControls}
                        width="100%"
                        height="100%"
                        volume={settings.volume / 100}
                        muted={true}
                        light={false}
                        pip={false}
                        stopOnUnmount={false}
                        onReady={() => {
                          log("✅ ReactPlayer READY callback triggered");
                          setIsPlayerReady(true);
                        }}
                        onStart={() => {
                          log("✅ ReactPlayer START callback triggered");
                          setPlayerState("playing");
                        }}
                        onPlay={() => {
                          log("✅ ReactPlayer PLAY callback triggered");
                          setPlayerState("playing");
                        }}
                        onPause={() => {
                          log("⏸️ ReactPlayer PAUSE callback triggered");
                        }}
                        onBuffer={() => {
                          log("🔄 ReactPlayer BUFFER callback triggered");
                        }}
                        onBufferEnd={() => {
                          log("✅ ReactPlayer BUFFER END callback triggered");
                        }}
                        onLoadStart={() => {
                          log("🔄 ReactPlayer LOAD START callback triggered");
                          setPlayerState("loading");
                        }}
                        onDuration={(duration: number) => {
                          log(`📏 ReactPlayer DURATION callback: ${duration} seconds`);
                        }}
                        onProgress={(state: any) => {
                          if (state.played > 0) {
                            log(`📊 ReactPlayer PROGRESS: ${Math.round(state.played * 100)}%`);
                            if (playerState !== "playing") {
                              setPlayerState("playing");
                            }
                          }
                        }}
                        onEnded={() => {
                          log("🏁 ReactPlayer ENDED callback triggered");
                          setPlayerState("ended");
                          finishVideo();
                        }}
                        onError={(error: any) => {
                          logError("❌ ReactPlayer ERROR callback:", error);
                          const videoId = extractVideoId(currentVideo.youtube_url || currentVideo.videoUrl || '');
                          handleVideoError(videoId || 'unknown', error);
                        }}
                        config={{
                          youtube: {
                            playerVars: {
                              autoplay: 1,
                              controls: settings.showControls ? 1 : 0,
                              modestbranding: 1,
                              rel: 0,
                              enablejsapi: 1,
                              iv_load_policy: 3
                            }
                          }
                        }}
                        style={{
                          backgroundColor: '#000'
                        }}
                      />
                    );
                  })()}
                  
                  {/* Muted indicator */}
                  <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    🔇 Відео заглушене для автозапуску
                  </div>
                  
                  {/* Player state indicator */}
                  {debugMode && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                      {playerState} | Ready: {isPlayerReady ? "✅" : "❌"}
                    </div>
                  )}
                </div>
              )}
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
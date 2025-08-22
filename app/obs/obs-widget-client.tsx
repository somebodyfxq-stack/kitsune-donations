"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createEventSource, customFetch } from "@/lib/fetch";

// Покращені типи на основі donatello.to
interface WidgetFont {
  fontFamily: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  color: { r: number; g: number; b: number; a: number };
  colorShadow?: { r: number; g: number; b: number; a: number };
  colorShadowWidth?: number;
  gradient?: boolean;
  gradientOne?: { r: number; g: number; b: number; a: number };
  gradientTwo?: { r: number; g: number; b: number; a: number };
  gradientAngle?: number;
}

interface WidgetConfig {
  showUpAnimation?: string;
  showUpAnimationDuration?: number;
  fadeOutAnimation?: string;
  fadeOutAnimationDuration?: number;
  headerFont?: WidgetFont;
  bodyFont?: WidgetFont;
  timeLength?: number;
  loudness?: number;
}

interface EventPayload {
  identifier: string;
  nickname: string;
  message: string;
  amount: number;
  createdAt: string;
  // Додаткові поля для покращеної функціональності
  currency?: string;
  customImage?: string;
  customSound?: string;
  customVideo?: string;
}

type ConnectionState = "connecting" | "connected" | "error" | "disconnected";

interface ObsWidgetClientProps {
  streamerId?: string;
  token?: string;
}

export function ObsWidgetClient({ streamerId, token }: ObsWidgetClientProps = {}) {
  // State
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<EventPayload | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [donationsPaused, setDonationsPaused] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [voiceName, setVoiceName] = useState("uk-UA-Standard-A");
  
  // Покращений стан на основі donatello.to
  const [currentAnimation, setCurrentAnimation] = useState<string>("");
  const [showingFadeOut, setShowingFadeOut] = useState(false);
  const [widgetConfig] = useState<WidgetConfig>({
    showUpAnimation: "bounceIn",
    showUpAnimationDuration: 1.5,
    fadeOutAnimation: "bounceOut", 
    fadeOutAnimationDuration: 1.0,
    timeLength: 8,
    loudness: 5,
    headerFont: {
      fontFamily: "Arial, sans-serif",
      fontSize: 24,
      isBold: true,
      isItalic: false,
      color: { r: 255, g: 255, b: 255, a: 1 },
      colorShadow: { r: 0, g: 0, b: 0, a: 0.5 },
      colorShadowWidth: 2
    },
    bodyFont: {
      fontFamily: "Arial, sans-serif",
      fontSize: 18,
      isBold: false,
      isItalic: false,
      color: { r: 200, g: 200, b: 200, a: 1 }
    }
  });
  
  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const queueRef = useRef<EventPayload[]>([]);
  const isProcessingRef = useRef(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const displayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);
  
  // Constants (покращені на основі donatello.to)
  const RECONNECT_DELAY = 3000;
  const PAUSE_CHECK_INTERVAL = 3000;
  const DISPLAY_DURATION = widgetConfig.timeLength ? widgetConfig.timeLength * 1000 : 8000;
  
  // Громкість як у donatello.to
  const loudness = {
    1: 0.003,
    2: 0.009,
    3: 0.06,
    4: 0.07,
    5: 0.09,
    6: 0.2,
    7: 0.4,
    8: 0.6,
    9: 0.8,
    10: 1,
  };
  
  // Refs для анімацій
  const fadeOutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize parameters from URL
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const voiceParam = url.searchParams.get("voice");
      setVoiceName(voiceParam && voiceParam.trim() !== "" ? voiceParam : "uk-UA-Standard-A");
      setDebugMode(url.searchParams.get("debug") === "true");
      console.log("🔧 Widget initialized with voice:", voiceName, "debug:", debugMode);
    } catch (err) {
      console.error("Failed to read URL parameters:", err);
    }
  }, []);

  // Pause state checker
  const checkPauseState = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await customFetch(`/api/donations/pause?token=${encodeURIComponent(token)}`);
      if (response.ok) {
        const result = await response.json();
        setDonationsPaused(result.paused);
        if (debugMode) console.log("📊 Pause state:", result.paused);
      } else if (response.status === 401) {
        console.warn("❌ Widget token is invalid or expired");
      }
    } catch (error) {
      console.error("Failed to check pause state:", error);
    }
  }, [token, debugMode]);

  // Cleanup functions (покращені на основі donatello.to)
  const clearAll = useCallback(() => {
    console.log("🧹 Clearing all donation elements");
    
    // Stop audio як у donatello.to
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    // Clear timeouts
    if (displayTimeoutRef.current) {
      clearTimeout(displayTimeoutRef.current);
      displayTimeoutRef.current = null;
    }
    
    if (fadeOutTimeoutRef.current) {
      clearTimeout(fadeOutTimeoutRef.current);
      fadeOutTimeoutRef.current = null;
    }
    
    // Reset state
    setVisible(false);
    setData(null);
    setCurrentAnimation("");
    setShowingFadeOut(false);
    isProcessingRef.current = false;
    
    // Run cleanup functions
    cleanupFunctionsRef.current.forEach(cleanup => {
      try {
        cleanup();
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    });
    cleanupFunctionsRef.current = [];
  }, []);

  // Set animations (як у donatello.to)
  const setAnimation = useCallback(() => {
    const showUpAnimation = widgetConfig.showUpAnimation && widgetConfig.showUpAnimation !== 'none';
    
    if (showUpAnimation) {
      console.log("🎭 Setting showUp animation:", widgetConfig.showUpAnimation);
      setCurrentAnimation(`animate__animated animate__${widgetConfig.showUpAnimation}`);
      
      // Fade out animation
      const fadeOutExists = widgetConfig.fadeOutAnimation && widgetConfig.fadeOutAnimation !== 'none';
      const fadeOutDuration = fadeOutExists ? (widgetConfig.fadeOutAnimationDuration || 1.0) * 1000 : 0;
      const animationTimeout = DISPLAY_DURATION - fadeOutDuration;
      
      if (fadeOutExists && animationTimeout > 0) {
        fadeOutTimeoutRef.current = setTimeout(() => {
          console.log("🎭 Setting fadeOut animation:", widgetConfig.fadeOutAnimation);
          setShowingFadeOut(true);
          setCurrentAnimation(`animate__animated animate__${widgetConfig.fadeOutAnimation}`);
        }, animationTimeout);
      }
    }
  }, [widgetConfig, DISPLAY_DURATION]);

  // Process donation queue (покращена на основі donatello.to)
  const processNextDonation = useCallback(() => {
    if (isProcessingRef.current || donationsPaused) {
      if (debugMode) console.log("⏸️ Processing skipped:", { processing: isProcessingRef.current, paused: donationsPaused });
      return;
    }
    
    const next = queueRef.current.shift();
    if (!next) {
      if (debugMode) console.log("📭 Queue empty");
      return;
    }
    
    console.log("🎯 Processing donation:", next);
    isProcessingRef.current = true;
    setData(next);
    setVisible(true);
    
    // Set animations
    setAnimation();
    
    // Create TTS
    const text = `${next.nickname} задонатив ${Math.round(next.amount)} гривень... ${next.message}`;
    const ttsUrl = `/api/tts?voice=${encodeURIComponent(voiceName)}&text=${encodeURIComponent(text)}&quality=optimal`;
    
    if (debugMode) {
      console.log("🎵 Starting TTS:", { text, voice: voiceName, url: ttsUrl });
    }

    // Play TTS and hide after duration (покращений на основі donatello.to)
    audioRef.current = new Audio(ttsUrl);
    audioRef.current.volume = loudness[(widgetConfig.loudness || 5) as keyof typeof loudness];
    
    const cleanup = () => {
      console.log("🔇 Hiding donation and processing next");
      clearAll();
      
      // Process next after delay як у donatello.to
      setTimeout(processNextDonation, 2000);
    };
    
    displayTimeoutRef.current = setTimeout(cleanup, DISPLAY_DURATION);
    cleanupFunctionsRef.current.push(() => {
      if (displayTimeoutRef.current) {
        clearTimeout(displayTimeoutRef.current);
      }
    });
    
    // Try to play audio як у donatello.to
    if (audioRef.current) {
      const promise = audioRef.current.play();
      if (promise) {
        promise.then(() => {
          if (debugMode) console.log("🎵 TTS started playing");
        }).catch(error => {
          console.warn("⚠️ Audio autoplay blocked:", error);
        });
      }
      
      // Cleanup when audio ends
      audioRef.current.onended = () => {
        if (debugMode) console.log("🎵 TTS finished");
      };
      
      audioRef.current.onerror = () => {
        console.warn("⚠️ TTS audio error");
      };
    }
    
    cleanupFunctionsRef.current.push(cleanup);
    
    // Safety timeout
    const safetyTimeout = setTimeout(() => {
      console.log("⏰ Safety timeout - finishing donation");
      finishDonation();
    }, DISPLAY_DURATION + 2000);
    
    cleanupFunctionsRef.current.push(() => clearTimeout(safetyTimeout));
    
  }, [donationsPaused, voiceName, debugMode]);

  // Finish current donation and process next
  const finishDonation = useCallback(() => {
    console.log("🏁 Finishing donation");
    
    setVisible(false);
    setData(null);
    
    // Clear display timeout
    if (displayTimeoutRef.current) {
      clearTimeout(displayTimeoutRef.current);
      displayTimeoutRef.current = null;
    }
    
    // Run cleanup functions
    cleanupFunctionsRef.current.forEach(cleanup => {
      try {
        cleanup();
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    });
    cleanupFunctionsRef.current = [];
    
    // Wait a bit then process next
    displayTimeoutRef.current = setTimeout(() => {
      isProcessingRef.current = false;
      processNextDonation();
    }, 2000);
    
  }, [processNextDonation]);

  // Add donation to queue
  const enqueueDonation = useCallback((payload: EventPayload) => {
    console.log("➕ Adding donation to queue:", payload);
    queueRef.current.push(payload);
    
    if (debugMode) {
      console.log("📊 Queue status:", { 
        length: queueRef.current.length, 
        processing: isProcessingRef.current,
        paused: donationsPaused 
      });
    }
    
    // Start processing if not already
    if (!isProcessingRef.current && !donationsPaused) {
      processNextDonation();
    }
  }, [processNextDonation, donationsPaused, debugMode]);

  // SSE Connection management
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      console.log("🔌 Closing existing EventSource");
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      }

      setConnectionState("connecting");
      const streamParam = streamerId ? `&streamerId=${encodeURIComponent(streamerId)}` : '';
    const url = `/api/stream?ts=${Date.now()}${streamParam}`;
    
    console.log("🌐 Connecting to SSE:", url);
      
      try {
      const eventSource = createEventSource(url);
      eventSourceRef.current = eventSource;
        
      eventSource.onopen = () => {
        console.log("✅ SSE Connected");
          setConnectionState("connected");
      };
        
      eventSource.onerror = (error) => {
        console.error("❌ SSE Error:", error);
          setConnectionState("error");
          
        // Reconnect after delay
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("🔄 Reconnecting SSE...");
          connectSSE();
        }, RECONNECT_DELAY);
      };

      // Handle donation events
      eventSource.addEventListener("donation", (event: MessageEvent) => {
        try {
          const payload: EventPayload = JSON.parse(event.data);
          console.log("🎯 Received donation event:", payload);
          enqueueDonation(payload);
        } catch (err) {
          console.error("❌ Failed to parse donation event:", err);
        }
      });

      // Handle YouTube donation events (show notification without video)
      eventSource.addEventListener("youtube-video", (event: MessageEvent) => {
        try {
          const payload: EventPayload = JSON.parse(event.data);
          console.log("🎬 Received YouTube donation (showing as regular):", payload);
          enqueueDonation(payload);
          } catch (err) {
          console.error("❌ Failed to parse YouTube event:", err);
        }
      });

      // Handle ping
      eventSource.addEventListener("ping", (event: MessageEvent) => {
        if (debugMode) console.log("📡 Ping received:", event.data);
      });

      } catch (error) {
        console.error("❌ Failed to create EventSource:", error);
        setConnectionState("error");
      }
  }, [streamerId, enqueueDonation, debugMode]);

  // Start pause state checking
  useEffect(() => {
    checkPauseState();

    pauseCheckIntervalRef.current = setInterval(checkPauseState, PAUSE_CHECK_INTERVAL);

    return () => {
      if (pauseCheckIntervalRef.current) {
        clearInterval(pauseCheckIntervalRef.current);
      }
    };
  }, [checkPauseState]);

  // Resume queue when unpaused
  useEffect(() => {
    if (!donationsPaused && !isProcessingRef.current && queueRef.current.length > 0) {
      console.log("▶️ Resuming queue after unpause");
      processNextDonation();
    }
  }, [donationsPaused, processNextDonation]);

  // Initialize SSE connection
  useEffect(() => {
    connectSSE();
    
    return () => {
      console.log("🧹 Cleaning up SSE connection");
      // Use our improved clearAll function
      clearAll();
      
      // Close SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectSSE]);

  return (
    <div className="pointer-events-none fixed inset-0 select-none" suppressHydrationWarning={true}>
      {/* Debug Info */}
      {debugMode && (
        <div className="pointer-events-auto fixed top-4 left-4 z-50 bg-black/80 text-white p-4 rounded text-sm max-w-xs">
          <div><strong>🔧 Debug Info:</strong></div>
          <div>Connection: {connectionState}</div>
          <div>Voice: {voiceName}</div>
          <div>Queue: {queueRef.current.length}</div>
          <div>Processing: {isProcessingRef.current ? "Yes" : "No"}</div>
          <div>Paused: {donationsPaused ? "Yes" : "No"}</div>
          <div>Visible: {visible ? "Yes" : "No"}</div>
            
            <button
              onClick={() => {
              console.log("🧪 Manual test donation");
              enqueueDonation({
                identifier: "test-" + Date.now(),
                  nickname: "TestUser",
                  message: "Manual test message",
                  amount: 100,
                  createdAt: new Date().toISOString()
              });
              }}
            className="block w-full bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs mt-2"
            >
            🧪 Test Donation
            </button>
        </div>
      )}

      {/* Notification Display (покращений на основі donatello.to) */}
      {visible && data && (
        <div className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div 
            className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-2xl p-8 max-w-lg w-full mx-4 border border-gray-600 ${currentAnimation}`}
            style={{
              animationDuration: showingFadeOut ? 
                `${widgetConfig.fadeOutAnimationDuration || 1.0}s` : 
                `${widgetConfig.showUpAnimationDuration || 1.5}s`
            }}
          >
            {/* Header Text - Nickname */}
            <div className="text-center mb-4">
              <h3 
                className="font-bold"
                style={{
                  fontFamily: widgetConfig.headerFont?.fontFamily || 'Arial, sans-serif',
                  fontSize: `${widgetConfig.headerFont?.fontSize || 24}px`,
                  fontWeight: widgetConfig.headerFont?.isBold ? 'bold' : 'normal',
                  fontStyle: widgetConfig.headerFont?.isItalic ? 'italic' : 'normal',
                  color: widgetConfig.headerFont?.color ? 
                    `rgba(${widgetConfig.headerFont.color.r}, ${widgetConfig.headerFont.color.g}, ${widgetConfig.headerFont.color.b}, ${widgetConfig.headerFont.color.a})` :
                    'white',
                  textShadow: widgetConfig.headerFont?.colorShadow ? 
                    `rgba(${widgetConfig.headerFont.colorShadow.r}, ${widgetConfig.headerFont.colorShadow.g}, ${widgetConfig.headerFont.colorShadow.b}, ${widgetConfig.headerFont.colorShadow.a}) 0px 0px ${widgetConfig.headerFont.colorShadowWidth || 2}px` :
                    '0px 0px 2px rgba(0,0,0,0.5)'
                }}
              >
                {data.nickname}
              </h3>
            </div>

            {/* Body Text - Message */}
            <div className="text-center mb-6">
              <p 
                className="leading-relaxed"
                style={{
                  fontFamily: widgetConfig.bodyFont?.fontFamily || 'Arial, sans-serif',
                  fontSize: `${widgetConfig.bodyFont?.fontSize || 18}px`,
                  fontWeight: widgetConfig.bodyFont?.isBold ? 'bold' : 'normal',
                  fontStyle: widgetConfig.bodyFont?.isItalic ? 'italic' : 'normal',
                  color: widgetConfig.bodyFont?.color ? 
                    `rgba(${widgetConfig.bodyFont.color.r}, ${widgetConfig.bodyFont.color.g}, ${widgetConfig.bodyFont.color.b}, ${widgetConfig.bodyFont.color.a})` :
                    'rgb(200, 200, 200)'
                }}
              >
                {data.message.length > 200 ? data.message.substring(0, 200) + '...' : data.message}
              </p>
            </div>

            {/* Amount */}
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400">
                {Math.round(data.amount)}₴
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animate.css styles - як у donatello.to */}
      <link 
        rel="stylesheet" 
        href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
        crossOrigin="anonymous"
      />
    </div>
  );
}

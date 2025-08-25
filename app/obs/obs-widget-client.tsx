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
  
  // Використовуємо loudness для налаштування гучності
  console.log(`🔊 Widget loudness configured to: ${widgetConfig.loudness}`);
  
  // Громкість як у donatello.to
  const _loudness = {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    
    // Stop audio with proper logging
    if (audioRef.current) {
      const audio = audioRef.current;
      console.log(`🎵 Stopping audio - ended: ${audio.ended}, currentTime: ${audio.currentTime.toFixed(2)}s, duration: ${audio.duration?.toFixed(2)}s`);
      audio.pause();
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
    
    // Prepare data but DON'T show card yet
    setData(next);
    
    // Create TTS first
    const text = `${next.nickname} задонатив ${Math.round(next.amount)} гривень... ${next.message}`;
    const ttsUrl = `/api/tts?voice=${encodeURIComponent(voiceName)}&text=${encodeURIComponent(text)}&quality=fast`;
    
    // SAVE YouTube URL at the start - before data can be cleared
    const savedYouTubeUrl = (next as any)?.youtube_url || (next as any)?.videoUrl || (next as any)?.youtubeUrl;
    const savedDonationData = {
      identifier: next.identifier,
      nickname: next.nickname,
      message: next.message,
      amount: next.amount,
      createdAt: next.createdAt
    };
    
    console.log("🎬 SAVED YouTube URL for later:", savedYouTubeUrl);
    
    if (debugMode) {
      console.log("🎵 Preparing TTS:", { text, voice: voiceName, url: ttsUrl });
    }

    // Create audio element and setup events BEFORE showing card
    audioRef.current = new Audio(ttsUrl);
    audioRef.current.volume = 0.9;
    
    // Simple cleanup when TTS finishes
    const handleTTSFinished = () => {
      console.log("🎵 TTS completed, keeping donation visible for a moment");
      
      // Keep donation visible longer before hiding and processing next
      setTimeout(() => {
        console.log("🎵 Now hiding donation after TTS completion");
        clearAll();
        setTimeout(() => {
          console.log("🔄 Processing next donation");
          processNextDonation();
        }, 3000); // Increased delay between donations
      }, 2000); // Keep donation visible for 2 seconds after TTS ends
    };
    
    // Remove fixed timeout - rely on TTS completion instead
    // displayTimeoutRef.current = setTimeout(cleanup, DISPLAY_DURATION);
    // cleanupFunctionsRef.current.push(() => {
    //   if (displayTimeoutRef.current) {
    //     clearTimeout(displayTimeoutRef.current);
    //   }
    // });
    
    // Setup comprehensive audio event listeners
    if (audioRef.current) {
      const audio = audioRef.current;
      
      // Show card and animation when audio is ready to play
      audio.addEventListener('canplay', () => {
        console.log("🎵 TTS ready to play - showing card now");
        setVisible(true);
        setAnimation();
      }, { once: true });
      
      // Alternative trigger if canplay doesn't fire
      audio.addEventListener('loadeddata', () => {
        console.log("🎵 TTS data loaded");
        if (!visible) {
          console.log("🎵 Fallback: showing card on loadeddata");
          setVisible(true);
          setAnimation();
        }
      }, { once: true });
      
      // When TTS actually starts playing
      audio.addEventListener('play', () => {
        console.log("🎵 TTS STARTED playing");
      });
      
      // Monitor progress
      audio.addEventListener('timeupdate', () => {
        if (debugMode && audio.duration) {
          const progress = (audio.currentTime / audio.duration * 100).toFixed(1);
          console.log(`🎵 TTS progress: ${progress}%`);
        }
      });
      
      // Try to play audio
      const promise = audio.play();
      if (promise) {
        promise.catch(error => {
          console.warn("⚠️ Audio autoplay blocked:", error);
          
          // Show card immediately if autoplay is blocked
          console.log("🎵 Autoplay blocked - showing card immediately");
          setVisible(true);
          setAnimation();
          
          // Fallback - call TTS finished after delay
          setTimeout(() => {
            console.log("🎬 FALLBACK - TTS autoplay blocked, treating as finished");
            
            if (savedYouTubeUrl) {
              fetch('/api/youtube/tts-complete', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  identifier: savedDonationData.identifier,
                  streamerId: streamerId
                })
              }).catch(apiError => {
                console.error("❌ Error calling TTS completion API on autoplay block:", apiError);
              });
            }
            
            handleTTSFinished();
          }, 3000);
        });
      }
      
      // Handle TTS completion and YouTube signal
      audio.addEventListener('ended', () => {
        console.log("🎵 TTS FINISHED!");
        
        // Use SAVED YouTube URL (not data which might be null)
        if (savedYouTubeUrl) {
          console.log("🎬 TTS finished, notifying API to start YouTube video:", savedYouTubeUrl);
          
          // Call API to change video status from 'waiting_for_tts' to 'pending'
          // This will now automatically broadcast TTS completion and queue update events
          fetch('/api/youtube/tts-complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              identifier: savedDonationData.identifier,
              streamerId: streamerId
            })
          }).then(response => {
            if (response.ok) {
              console.log("🎬 TTS completion broadcasted via SSE - YouTube video will start automatically");
            } else {
              console.error("❌ Failed to notify API about TTS completion");
            }
          }).catch(error => {
            console.error("❌ Error calling TTS completion API:", error);
          });
        } else {
          console.log("❌ NO saved YouTube URL found!");
        }
        
        // Finish donation
        handleTTSFinished();
      });
      
      audio.addEventListener('error', (errorEvent) => {
        console.warn("⚠️ TTS ERROR detected:", errorEvent);
        
        // Don't immediately finish on error - try to continue
        console.log("🎵 TTS error detected, but continuing to show card and wait...");
        
        // Show card if not shown yet
        if (!visible) {
          setVisible(true);
          setAnimation();
        }
        
        // Use SAVED YouTube URL (not data which might be null)
        if (savedYouTubeUrl) {
          console.log("🎬 TTS had error but will still proceed to YouTube video");
          
          // Call API to proceed to video after longer delay  
          // This will broadcast TTS error and still allow video to proceed
          setTimeout(() => {
            fetch('/api/youtube/tts-complete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                identifier: savedDonationData.identifier,
                streamerId: streamerId
              })
            }).catch(apiError => {
              console.error("❌ Error calling TTS completion API on error:", apiError);
            });
          }, 3000); // Wait 3 seconds before proceeding
        }
        
        // Much longer delay for error case to allow manual reading of donation
        setTimeout(() => {
          handleTTSFinished();
        }, 8000); // 8 seconds instead of 2
      });
    }
    
    // Safety timeout - increased for longer TTS messages
    const safetyTimeout = setTimeout(() => {
      console.log("⏰ SAFETY TIMEOUT - forcing cleanup");
      handleTTSFinished();
    }, 30000); // 30 second safety timeout (increased from 20s)
    
    cleanupFunctionsRef.current.push(() => clearTimeout(safetyTimeout));
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donationsPaused, voiceName, debugMode]);

  // Finish current donation and process next
  const _finishDonation = useCallback(() => {
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

      // Handle YouTube donation events (show notification, then signal YouTube widget)
      eventSource.addEventListener("youtube-video", (event: MessageEvent) => {
        try {
          const payload: EventPayload = JSON.parse(event.data);
          console.log("🎬 Received YouTube donation (showing notification first):", payload);
          
          // Show donation notification first
          enqueueDonation(payload);
          
          // YouTube signal will be sent after TTS finishes (handled in audioRef.onended)
          
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

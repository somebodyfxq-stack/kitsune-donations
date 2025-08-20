"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface YouTubeEventPayload {
  identifier: string;
  nickname: string;
  message: string;
  amount: number;
  createdAt: string;
  videoUrl?: string;
}

interface YouTubeSettings {
  maxDurationMinutes: number;
  volume: number;
  showClipTitle: boolean;
  showDonorName: boolean;
  minLikes: number;
  minViews: number;
  minComments: number;
  showImmediately: boolean;
}

type ConnectionState = "connecting" | "connected" | "error";

interface YouTubeWidgetClientProps {
  streamerId?: string;
  settings?: YouTubeSettings;
}

const defaultSettings: YouTubeSettings = {
  maxDurationMinutes: 5,
  volume: 50,
  showClipTitle: true,
  showDonorName: true,
  minLikes: 0,
  minViews: 0,
  minComments: 0,
  showImmediately: false
};

export function YouTubeWidgetClient({ streamerId, settings = defaultSettings }: YouTubeWidgetClientProps) {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<YouTubeEventPayload | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [debugMode, setDebugMode] = useState(false);
  
  const videoQueueRef = useRef<YouTubeEventPayload[]>([]);
  const isPlayingVideoRef = useRef(false);
  const videoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerRef = useRef<any>(null);

  // Завантаження YouTube IFrame API
  useEffect(() => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // Глобальна функція для ініціалізації YouTube API
    (window as any).onYouTubeIframeAPIReady = () => {
      console.log("YouTube IFrame API ready");
    };

    return () => {
      // Cleanup
      delete (window as any).onYouTubeIframeAPIReady;
    };
  }, []);

  const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const validateVideo = async (videoId: string): Promise<boolean> => {
    try {
      // Використовуємо YouTube oEmbed API для перевірки метаданих
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      
      if (!response.ok) {
        console.log("Video not found or unavailable");
        return false;
      }
      
      const data = await response.json();
      setVideoTitle(data.title || "Невідома назва");
      
      // TODO: Додати перевірку на лайки, перегляди, коментарі через YouTube Data API
      // Поки що просто перевіряємо, що відео існує
      
      return true;
    } catch (error) {
      console.error("Error validating video:", error);
      return false;
    }
  };

  const playVideo = useCallback(async (videoId: string, startTime: number = 0) => {
    if (!playerRef.current) {
      // Створюємо новий плеєр
      playerRef.current = new (window as any).YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          start: startTime,
          iv_load_policy: 3,
          cc_load_policy: 0,
          loop: 0,
          playlist: videoId
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(settings.volume);
            event.target.playVideo();
          },
          onStateChange: (event: any) => {
            const state = event.data;
            // YT.PlayerState.ENDED = 0
            if (state === 0) {
              console.log("Video ended");
              finishVideo();
            }
          },
          onError: (event: any) => {
            console.error("YouTube player error:", event.data);
            finishVideo();
          }
        }
      });
    } else {
      // Використовуємо існуючий плеєр
      playerRef.current.loadVideoById({
        videoId: videoId,
        startSeconds: startTime
      });
      playerRef.current.setVolume(settings.volume);
    }
  }, [settings.volume]);

  const playNextVideo = useCallback(async () => {
    console.log("🎬 playNextVideo() called");
    console.log("📊 Current video queue length:", videoQueueRef.current.length);
    
    if (videoTimeoutRef.current) {
      clearTimeout(videoTimeoutRef.current);
      videoTimeoutRef.current = null;
    }
    
    const next = videoQueueRef.current.shift();
    if (!next || !next.videoUrl) {
      console.log("❌ No valid video in queue");
      isPlayingVideoRef.current = false;
      return;
    }
    
    console.log("🎯 Processing YouTube video:", next);
    
    const videoId = extractVideoId(next.videoUrl);
    if (!videoId) {
      console.log("❌ Invalid YouTube URL");
      playNextVideo(); // Спробувати наступне відео
      return;
    }
    
    // Перевіряємо чи відео доступне
    const isValid = await validateVideo(videoId);
    if (!isValid) {
      console.log("❌ Video validation failed");
      playNextVideo(); // Спробувати наступне відео
      return;
    }
    
    setData(next);
    setCurrentVideo(videoId);
    isPlayingVideoRef.current = true;
    setVisible(true);
    
    // Запускаємо відео
    await playVideo(videoId);
    
    // Встановлюємо максимальний час відтворення
    const maxDurationMs = settings.maxDurationMinutes * 60 * 1000;
    videoTimeoutRef.current = setTimeout(() => {
      console.log("⏰ Video time limit reached");
      finishVideo();
    }, maxDurationMs);
    
  }, [settings.maxDurationMinutes, playVideo, validateVideo]);

  const finishVideo = useCallback(() => {
    setVisible(false);
    setCurrentVideo(null);
    setVideoTitle("");
    
    if (videoTimeoutRef.current) {
      clearTimeout(videoTimeoutRef.current);
      videoTimeoutRef.current = null;
    }
    
    videoTimeoutRef.current = setTimeout(() => {
      isPlayingVideoRef.current = false;
      playNextVideo();
    }, 2000);
  }, [playNextVideo]);

  const enqueue = useCallback((payload: YouTubeEventPayload) => {
    console.log("🔄 Enqueue YouTube video:", payload);
    
    if (!payload.videoUrl) {
      console.log("❌ No video URL in payload, treating as regular donation");
      // TODO: Відправити до звичайного віджету донатів
      return;
    }
    
    // Додаємо відео до черги
    videoQueueRef.current.push(payload);
    console.log("📝 Video queue length after push:", videoQueueRef.current.length);
    
    if (settings.showImmediately) {
      console.log("⚡ Show immediately enabled - video will play independently");
      // При увімкненому "показати одразу", відео відтворюється незалежно
      if (!isPlayingVideoRef.current && !videoTimeoutRef.current) {
        console.log("▶️ Starting video playback immediately");
        playNextVideo();
      }
    } else {
      console.log("⏸️ Show immediately disabled - video queued for sequential playback");
      // При вимкненому "показати одразу", чекаємо закінчення поточного відео
      if (!isPlayingVideoRef.current && !videoTimeoutRef.current) {
        console.log("▶️ No video currently playing, starting next video");
        playNextVideo();
      }
    }
  }, [settings.showImmediately, playNextVideo]);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      setDebugMode(url.searchParams.get("debug") === "true");
    } catch (err) {
      console.error("Failed to read debug parameter", err);
    }
  }, []);

  useEffect(() => {
    let es: EventSource;
    
    function connect() {
      setConnectionState("connecting");
      const streamParam = streamerId ? `&streamerId=${encodeURIComponent(streamerId)}` : '';
      const url = `/api/stream?ts=${Date.now()}${streamParam}`;
      
      console.log("🎬 YouTube Widget connecting to SSE:", url);
      es = new EventSource(url);
      
      es.addEventListener("open", () => {
        console.log("✅ YouTube Widget SSE connected successfully");
        setConnectionState("connected");
      });
      
      es.addEventListener("error", (err) => {
        console.error("❌ YouTube Widget EventSource error:", err);
        console.log("📊 EventSource readyState:", es.readyState);
        setConnectionState("error");
        es.close();
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        console.log("🔄 YouTube Widget attempting reconnect in 3 seconds...");
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      });
      
      es.addEventListener("ping", (ev) => {
        console.log("📡 YouTube Widget ping received:", (ev as MessageEvent).data);
      });
      
      es.addEventListener("youtube-video", (ev) => {
        try {
          console.log("🎯 Received YouTube video event:", (ev as MessageEvent).data);
          const payload: YouTubeEventPayload = JSON.parse((ev as MessageEvent).data);
          console.log("📦 Parsed YouTube payload:", payload);
          enqueue(payload);
        } catch (err) {
          console.error("❌ Failed to handle YouTube video event", err);
        }
      });
    }
    
    connect();

    return () => {
      es?.close();
      if (videoTimeoutRef.current) {
        clearTimeout(videoTimeoutRef.current);
        videoTimeoutRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [streamerId, enqueue]);

  return (
    <div
      className="pointer-events-none fixed inset-0 select-none"
      style={{ background: "transparent" }}
      suppressHydrationWarning={true}
    >
      {/* Діагностична інформація */}
      {debugMode && (
        <div className="pointer-events-auto fixed top-4 left-4 z-50 bg-black/80 text-white p-4 rounded text-sm max-w-xs">
          <div><strong>YouTube Widget Debug:</strong></div>
          <div>Connection: {connectionState}</div>
          <div>Video Queue: {videoQueueRef.current.length}</div>
          <div>Playing Video: {isPlayingVideoRef.current ? "Yes" : "No"}</div>
          <div>Visible: {visible ? "Yes" : "No"}</div>
          <div>Current Video: {currentVideo || "None"}</div>
          
          <button
            onClick={() => {
              console.log("🧪 Simulating YouTube video manually");
              const fakeVideo: YouTubeEventPayload = {
                identifier: "manual-test-" + Date.now(),
                nickname: "TestUser",
                message: "Manual YouTube test",
                amount: 100,
                createdAt: new Date().toISOString(),
                videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" // Rick Roll для тесту
              };
              enqueue(fakeVideo);
            }}
            className="block w-full bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs mt-2"
          >
            🎯 Test YouTube Video
          </button>
        </div>
      )}

      {/* YouTube відео плеєр */}
      {visible && currentVideo && (
        <div className="fixed inset-0 flex items-center justify-center z-20 bg-black">
          {/* Інформація про відео */}
          <div className="absolute top-8 left-8 right-8 z-30">
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white">
              {settings.showDonorName && data && (
                <div className="text-lg font-bold mb-2">
                  {data.nickname} задонатив {Math.round(data.amount)}₴
                </div>
              )}
              {settings.showClipTitle && (
                <div className="text-md opacity-90">
                  {videoTitle}
                </div>
              )}
              {data?.message && (
                <div className="text-sm opacity-75 mt-2">
                  {data.message}
                </div>
              )}
            </div>
          </div>
          
          {/* YouTube плеєр */}
          <div className="w-full h-full">
            <div id="youtube-player" className="w-full h-full"></div>
          </div>
        </div>
      )}
    </div>
  );
}

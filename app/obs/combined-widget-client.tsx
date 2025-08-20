"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface EventPayload {
  identifier: string;
  nickname: string;
  message: string;
  amount: number;
  createdAt: string;
  youtubeUrl?: string | null;
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

interface CombinedWidgetClientProps {
  streamerId?: string;
  youtubeSettings?: YouTubeSettings;
}

const defaultYouTubeSettings: YouTubeSettings = {
  maxDurationMinutes: 5,
  volume: 50,
  showClipTitle: true,
  showDonorName: true,
  minLikes: 0,
  minViews: 0,
  minComments: 0,
  showImmediately: false
};

export function CombinedWidgetClient({ 
  streamerId, 
  youtubeSettings = defaultYouTubeSettings 
}: CombinedWidgetClientProps) {
  // Стан для звичайних донатів
  const [donationVisible, setDonationVisible] = useState(false);
  const [donationData, setDonationData] = useState<EventPayload | null>(null);
  
  // Стан для YouTube відео
  const [videoVisible, setVideoVisible] = useState(false);
  const [videoData, setVideoData] = useState<EventPayload | null>(null);
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>("");
  
  // Загальний стан
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [debugMode, setDebugMode] = useState(false);

  // Черги та стани відтворення
  const donationQueueRef = useRef<EventPayload[]>([]);
  const videoQueueRef = useRef<EventPayload[]>([]);
  const isPlayingDonationRef = useRef(false);
  const isPlayingVideoRef = useRef(false);
  const donationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerRef = useRef<any>(null);

  // YouTube API
  useEffect(() => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    (window as any).onYouTubeIframeAPIReady = () => {
      console.log("YouTube IFrame API ready");
    };

    return () => {
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
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      
      if (!response.ok) {
        console.log("Video not found or unavailable");
        return false;
      }
      
      const data = await response.json();
      setVideoTitle(data.title || "Невідома назва");
      
      return true;
    } catch (error) {
      console.error("Error validating video:", error);
      return false;
    }
  };

  const playVideo = useCallback(async (videoId: string, startTime: number = 0) => {
    if (!playerRef.current) {
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
            event.target.setVolume(youtubeSettings.volume);
            event.target.playVideo();
          },
          onStateChange: (event: any) => {
            const state = event.data;
            if (state === 0) { // YT.PlayerState.ENDED
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
      playerRef.current.loadVideoById({
        videoId: videoId,
        startSeconds: startTime
      });
      playerRef.current.setVolume(youtubeSettings.volume);
    }
  }, [youtubeSettings.volume]);

  const finishDonation = useCallback(() => {
    setDonationVisible(false);
    setDonationData(null);
    
    if (donationTimeoutRef.current) {
      clearTimeout(donationTimeoutRef.current);
      donationTimeoutRef.current = null;
    }
    
    donationTimeoutRef.current = setTimeout(() => {
      isPlayingDonationRef.current = false;
      playNextDonation();
    }, 2000);
  }, []);

  const finishVideo = useCallback(() => {
    setVideoVisible(false);
    setVideoData(null);
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
  }, []);

  const playNextDonation = useCallback(() => {
    console.log("🎬 playNextDonation() called");
    
    if (donationTimeoutRef.current) {
      clearTimeout(donationTimeoutRef.current);
      donationTimeoutRef.current = null;
    }
    
    const next = donationQueueRef.current.shift();
    if (!next) {
      console.log("❌ No donations in queue");
      isPlayingDonationRef.current = false;
      return;
    }
    
    console.log("🎯 Processing donation:", next);
    
    setDonationData(next);
    isPlayingDonationRef.current = true;
    setDonationVisible(true);
    
    // Тривалість сповіщення - 5 секунд
    donationTimeoutRef.current = setTimeout(() => {
      finishDonation();
    }, 5000);
  }, [finishDonation]);

  const playNextVideo = useCallback(async () => {
    console.log("🎬 playNextVideo() called");
    
    if (videoTimeoutRef.current) {
      clearTimeout(videoTimeoutRef.current);
      videoTimeoutRef.current = null;
    }
    
    const next = videoQueueRef.current.shift();
    if (!next || !next.youtubeUrl) {
      console.log("❌ No valid video in queue");
      isPlayingVideoRef.current = false;
      return;
    }
    
    console.log("🎯 Processing YouTube video:", next);
    
    const videoId = extractVideoId(next.youtubeUrl);
    if (!videoId) {
      console.log("❌ Invalid YouTube URL");
      playNextVideo();
      return;
    }
    
    const isValid = await validateVideo(videoId);
    if (!isValid) {
      console.log("❌ Video validation failed");
      playNextVideo();
      return;
    }
    
    setVideoData(next);
    setCurrentVideo(videoId);
    isPlayingVideoRef.current = true;
    setVideoVisible(true);
    
    await playVideo(videoId);
    
    const maxDurationMs = youtubeSettings.maxDurationMinutes * 60 * 1000;
    videoTimeoutRef.current = setTimeout(() => {
      console.log("⏰ Video time limit reached");
      finishVideo();
    }, maxDurationMs);
  }, [youtubeSettings.maxDurationMinutes, playVideo, validateVideo, finishVideo]);

  const enqueue = useCallback((payload: EventPayload) => {
    console.log("🔄 Enqueue event:", payload);
    
    if (payload.youtubeUrl) {
      // Це YouTube донат
      videoQueueRef.current.push(payload);
      console.log("📺 Video queue length:", videoQueueRef.current.length);
      
      if (youtubeSettings.showImmediately) {
        // Відео відтворюється незалежно
        if (!isPlayingVideoRef.current && !videoTimeoutRef.current) {
          playNextVideo();
        }
        
        // Сповіщення також може показатись незалежно
        if (!youtubeSettings.showImmediately || (!isPlayingDonationRef.current && !donationTimeoutRef.current)) {
          donationQueueRef.current.push({ ...payload, youtubeUrl: null }); // Видаляємо URL для сповіщення
          if (!isPlayingDonationRef.current && !donationTimeoutRef.current) {
            playNextDonation();
          }
        }
      } else {
        // Послідовне відтворення: спочатку сповіщення, потім відео
        if (!isPlayingDonationRef.current && !donationTimeoutRef.current && 
            !isPlayingVideoRef.current && !videoTimeoutRef.current) {
          // Показуємо сповіщення спочатку
          donationQueueRef.current.push({ ...payload, youtubeUrl: null });
          playNextDonation();
        } else {
          // Додаємо до черги
          donationQueueRef.current.push({ ...payload, youtubeUrl: null });
        }
        
        if (!isPlayingVideoRef.current && !videoTimeoutRef.current) {
          playNextVideo();
        }
      }
    } else {
      // Це звичайний донат
      donationQueueRef.current.push(payload);
      console.log("💝 Donation queue length:", donationQueueRef.current.length);
      
      if (!isPlayingDonationRef.current && !donationTimeoutRef.current) {
        playNextDonation();
      }
    }
  }, [youtubeSettings.showImmediately, playNextDonation, playNextVideo]);

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
      es = new EventSource(`/api/stream?ts=${Date.now()}${streamParam}`);
      
      es.addEventListener("open", () => setConnectionState("connected"));
      
      es.addEventListener("error", (err) => {
        console.error("EventSource error", err);
        setConnectionState("error");
        es.close();
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      });
      
      es.addEventListener("donation", (ev) => {
        try {
          console.log("🎯 Received donation event:", (ev as MessageEvent).data);
          const payload: EventPayload = JSON.parse((ev as MessageEvent).data);
          enqueue(payload);
        } catch (err) {
          console.error("❌ Failed to handle donation event", err);
        }
      });
      
      es.addEventListener("youtube-video", (ev) => {
        try {
          console.log("🎯 Received YouTube video event:", (ev as MessageEvent).data);
          const payload: EventPayload = JSON.parse((ev as MessageEvent).data);
          enqueue(payload);
        } catch (err) {
          console.error("❌ Failed to handle YouTube video event", err);
        }
      });
    }
    
    connect();

    return () => {
      es?.close();
      if (donationTimeoutRef.current) {
        clearTimeout(donationTimeoutRef.current);
        donationTimeoutRef.current = null;
      }
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
          <div><strong>Combined Widget Debug:</strong></div>
          <div>Connection: {connectionState}</div>
          <div>Donation Queue: {donationQueueRef.current.length}</div>
          <div>Video Queue: {videoQueueRef.current.length}</div>
          <div>Playing Donation: {isPlayingDonationRef.current ? "Yes" : "No"}</div>
          <div>Playing Video: {isPlayingVideoRef.current ? "Yes" : "No"}</div>
          <div>Show Immediately: {youtubeSettings.showImmediately ? "Yes" : "No"}</div>
          
          <button
            onClick={() => {
              const fakeVideo: EventPayload = {
                identifier: "test-video-" + Date.now(),
                nickname: "TestUser",
                message: "Test YouTube video",
                amount: 100,
                createdAt: new Date().toISOString(),
                youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              };
              enqueue(fakeVideo);
            }}
            className="block w-full bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs mt-2"
          >
            🎯 Test Video
          </button>

          <button
            onClick={() => {
              const fakeDonation: EventPayload = {
                identifier: "test-donation-" + Date.now(),
                nickname: "TestDonor",
                message: "Test donation",
                amount: 50,
                createdAt: new Date().toISOString()
              };
              enqueue(fakeDonation);
            }}
            className="block w-full bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs mt-1"
          >
            🎯 Test Donation
          </button>
        </div>
      )}

      {/* Сповіщення про донат */}
      {donationVisible && donationData && (
        <div className="fixed inset-0 flex items-center justify-center z-10">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
            <div className="text-center mb-4">
              <h3 className="text-2xl font-bold text-gray-800">
                {donationData.nickname}
              </h3>
            </div>
            <div className="text-center mb-6">
              <p className="text-gray-600 text-lg leading-relaxed">
                {donationData.message.length > 200 ? donationData.message.substring(0, 200) + '...' : donationData.message}
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">
                {Math.round(donationData.amount)}₴
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YouTube відео */}
      {videoVisible && currentVideo && (
        <div className="fixed inset-0 flex items-center justify-center z-20 bg-black">
          {youtubeSettings.showDonorName && videoData && (
            <div className="absolute top-8 left-8 right-8 z-30">
              <div className="bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white">
                <div className="text-lg font-bold mb-2">
                  {videoData.nickname} задонатив {Math.round(videoData.amount)}₴
                </div>
                {youtubeSettings.showClipTitle && (
                  <div className="text-md opacity-90">
                    {videoTitle}
                  </div>
                )}
                {videoData.message && (
                  <div className="text-sm opacity-75 mt-2">
                    {videoData.message}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="w-full h-full">
            <div id="youtube-player" className="w-full h-full"></div>
          </div>
        </div>
      )}
    </div>
  );
}


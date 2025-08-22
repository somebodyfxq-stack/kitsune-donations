"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createEventSource } from "@/lib/fetch";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

// Динамічний імпорт react-player для оптимізації (SSR compatibility)
const ReactPlayer = dynamic(() => import("react-player"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
        <p>Завантаження плеєра...</p>
      </div>
    </div>
  ),
}) as any; // Обходимо TypeScript типи для сумісності

interface VideoPayload {
  id: string;
  nickname: string;
  title: string;
  youtubeId: string;
}

interface ConnectionState {
  status: "connecting" | "connected" | "error";
}

export function VideoClient() {
  const [current, setCurrent] = useState<VideoPayload | null>(null);
  const [connection, setConnection] = useState<ConnectionState>({
    status: "connecting",
  });
  const queueRef = useRef<VideoPayload[]>([]);
  const currentRef = useRef<VideoPayload | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playNext = useCallback(() => {
    const next = queueRef.current.shift() || null;
    setCurrent(next);
  }, []);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    let es: EventSource;
    function connect() {
      setConnection({ status: "connecting" });
      es = createEventSource("/api/video-stream?ts=" + Date.now());
      es.addEventListener("open", () => setConnection({ status: "connected" }));
      es.addEventListener("error", () => {
        setConnection({ status: "error" });
        es.close();
        // Очистити попередній reconnect таймер
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      });
      es.addEventListener("video", (ev) => {
        try {
          const payload: VideoPayload = JSON.parse((ev as MessageEvent).data);
          queueRef.current.push(payload);
          if (!currentRef.current) playNext();
        } catch (err) {
          console.error("Failed to parse video event", err);
        }
      });
    }
    connect();
    return () => {
      es.close();
      // Очистити reconnect таймер при unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [playNext]);

  function handleSkip() {
    playNext();
  }

  function handleClear() {
    queueRef.current = [];
    setCurrent(null);
  }

  return (
    <div className="relative h-full w-full">
      <div className="absolute right-3 top-2 text-xs">
        {connection.status === "connected" && (
          <span className="text-green-500">Підключено</span>
        )}
        {connection.status === "connecting" && (
          <span className="text-yellow-500">Підключення...</span>
        )}
        {connection.status === "error" && (
          <span className="text-red-500">Немає з'єднання</span>
        )}
      </div>
      {current && (
        <div className="h-full w-full">
          <div className="absolute left-3 top-3 rounded-md bg-black/60 p-3 text-white">
            <div className="text-sm font-semibold">{current.title}</div>
            <div className="mt-1 text-xs opacity-75">{current.nickname}</div>
          </div>
          <div className="h-full w-full">
            <VideoPlayer videoId={current.youtubeId} onEnd={playNext} />
          </div>
        </div>
      )}
      <div className="absolute bottom-3 right-3 flex gap-2">
        <Button
          type="button"
          onClick={handleSkip}
          disabled={!current && queueRef.current.length === 0}
        >
          Пропустити
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          disabled={!current && queueRef.current.length === 0}
        >
          Очистити
        </Button>
      </div>
    </div>
  );
}

interface VideoPlayerProps {
  videoId: string;
  onEnd: () => void;
}

function VideoPlayer({ videoId, onEnd }: VideoPlayerProps) {
  const playerRef = useRef<any>(null);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Створюємо URL з videoId для react-player
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const handleReady = () => {
    console.log('ReactPlayer ready for video:', videoId);
    setIsReady(true);
    setHasError(false);
  };

  const handleStart = () => {
    console.log('Video started playing:', videoId);
    setIsPlaying(true);
  };

  const handlePlay = () => {
    console.log('Video play event:', videoId);
    setIsPlaying(true);
  };

  const handlePause = () => {
    console.log('Video paused:', videoId);
    setIsPlaying(false);
  };

  const handleEnded = () => {
    console.log('Video ended:', videoId);
    setIsPlaying(false);
    onEnd();
  };

  const handleError = (error: any) => {
    console.error('ReactPlayer error:', error);
    setHasError(true);
    setIsPlaying(false);
    
    // Автоматично пропускаємо відео через 3 секунди якщо є помилка
    setTimeout(() => {
      onEnd();
    }, 3000);
  };

  const handleProgress = (state: any) => {
    // Логування прогресу (опціонально)
    if (state.played > 0) {
      console.log(`Video progress: ${Math.round(state.played * 100)}%`);
    }
  };

  const handleSkipVideo = () => {
    setHasError(false);
    setIsPlaying(false);
    onEnd();
  };

  if (hasError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-black text-white">
        <div className="text-center space-y-4">
          <div className="text-red-400 text-4xl">⚠️</div>
          <div>
            <p className="text-lg font-semibold">Відео недоступне для відтворення</p>
            <p className="text-sm opacity-75 mt-1">ID: {videoId}</p>
            <p className="text-xs opacity-60 mt-1">
              Можливо відео приватне або заблоковане
            </p>
          </div>
          <button 
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            onClick={handleSkipVideo}
          >
            Пропустити відео
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-white z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">Завантаження відео...</p>
          </div>
        </div>
      )}
      
      <ReactPlayer
        ref={playerRef}
        url={videoUrl}
        playing={isPlaying}
        controls={true}
        width="100%"
        height="100%"
        muted={true}
        volume={0.8}
        progressInterval={1000}
        onReady={handleReady}
        onStart={handleStart}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        onProgress={handleProgress}
        style={{
          backgroundColor: '#000'
        }}
      />

      {/* Індикатор стану відтворення */}
      {isReady && (
        <div className="absolute top-2 right-2 z-20">
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            isPlaying 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-600 text-white'
          }`}>
            {isPlaying ? '▶️ Відтворення' : '⏸️ Пауза'}
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ Відео віджет повністю переписаний з react-player
// Підтримує YouTube, Vimeo, Wistia, HLS, DASH та багато інших платформ

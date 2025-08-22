"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createEventSource } from "@/lib/fetch";
import { Button } from "@/components/ui/button";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    function handleState(event: { data: number }) {
      if (event.data === window.YT?.PlayerState?.ENDED) onEnd();
    }
    
    function createPlayer() {
      if (!containerRef.current) return;
      // 🎯 Створюємо плеєр як donatello.to
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { 
          'autoplay': 1, 
          'controls': 1, // 🎯 Показуємо controls як donatello.to
          'start': 0 
        },
        events: { onStateChange: handleState },
      });
      // 🎯 Видаляємо iframe налаштування - не потрібні для player_api
    }

    // 🎯 Перевірити чи скрипт уже завантажений (donatello.to style)
    const existingScript = document.querySelector('script[src="https://www.youtube.com/player_api"]');
    
    if (window.YT?.Player) {
      createPlayer();
    } else if (!existingScript) {
      // 🎯 Зберегти попередній callback (donatello.to style)
      const originalCallback = window.onYouTubePlayerAPIReady;
      
      window.onYouTubePlayerAPIReady = () => {
        createPlayer();
        // Викликати попередній callback якщо він був
        if (originalCallback && typeof originalCallback === 'function') {
          originalCallback();
        }
      };
      
      // 🎯 Використовуємо player_api як donatello.to
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/player_api";
      script.id = "youtube-player-api";
      
      // 🎯 Додаємо до першого script тега як donatello.to
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(script, firstScriptTag);
      } else {
        document.head.appendChild(script);
      }
    } else {
      // Скрипт завантажується, просто дочекаємося
      const checkYT = setInterval(() => {
        if (window.YT?.Player) {
          clearInterval(checkYT);
          createPlayer();
        }
      }, 100);
      
      // Cleanup інтервал
      return () => {
        clearInterval(checkYT);
        playerRef.current?.destroy();
      };
    }
    
    return () => {
      playerRef.current?.destroy();
    };
  }, [videoId, onEnd]);

  useEffect(() => {
    if (playerRef.current) playerRef.current.loadVideoById(videoId);
  }, [videoId]);

  return <div ref={containerRef} className="h-full w-full" />;
}

interface YTPlayer {
  loadVideoById(id: string): void;
  destroy(): void;
  // 🎯 Видаляємо getIframe() - не потрібно для player_api
}

declare global {
  interface Window {
    YT: {
      Player: new (
        element: HTMLElement,
        options: {
          videoId?: string;
          playerVars?: Record<string, string | number>;
          events?: { onStateChange?: (event: { data: number }) => void };
        },
      ) => YTPlayer;
      PlayerState: { ENDED: number };
    };
    // 🎯 Використовуємо правильний callback для player_api
    onYouTubePlayerAPIReady?: () => void;
  }
}

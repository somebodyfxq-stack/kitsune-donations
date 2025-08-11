"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
      es = new EventSource("/api/video-stream?ts=" + Date.now());
      es.addEventListener("open", () => setConnection({ status: "connected" }));
      es.addEventListener("error", () => {
        setConnection({ status: "error" });
        es.close();
        setTimeout(connect, 3000);
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
    return () => es.close();
  }, [playNext]);

  function handleSkip() {
    playNext();
  }

  function handleClear() {
    queueRef.current = [];
    setCurrent(null);
  }

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-2 right-3 text-xs">
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
        <div className="w-full h-full">
          <div className="absolute top-3 left-3 bg-black/60 text-white rounded-md p-3">
            <div className="text-sm font-semibold">{current.title}</div>
            <div className="text-xs opacity-75 mt-1">{current.nickname}</div>
          </div>
          <div className="w-full h-full">
            <VideoPlayer videoId={current.youtubeId} onEnd={playNext} />
          </div>
        </div>
      )}
      <div className="absolute bottom-3 right-3 flex gap-2">
        <Button type="button" onClick={handleSkip} disabled={!current && queueRef.current.length === 0}>
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
      playerRef.current = new window.YT.Player(containerRef.current!, {
        videoId,
        playerVars: { autoplay: 1, controls: 0, rel: 0 },
        events: { onStateChange: handleState },
      });
    }
    if (window.YT?.Player) createPlayer();
    else {
      window.onYouTubeIframeAPIReady = createPlayer;
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    }
    return () => {
      playerRef.current?.destroy();
    };
  }, [videoId, onEnd]);

  useEffect(() => {
    if (playerRef.current) playerRef.current.loadVideoById(videoId);
  }, [videoId]);

  return <div ref={containerRef} className="w-full h-full" />;
}

interface YTPlayer {
  loadVideoById(id: string): void;
  destroy(): void;
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
    onYouTubeIframeAPIReady?: () => void;
  }
}


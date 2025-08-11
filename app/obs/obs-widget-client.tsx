"use client";

import { useEffect, useRef, useState } from "react";

interface EventPayload {
  identifier: string;
  nickname: string;
  message: string;
  amount: number;
  createdAt: string;
}

type ConnectionState = "connecting" | "connected" | "error";

export function ObsWidgetClient() {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<EventPayload | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const audioAllowedRef = useRef(false);
  const queueRef = useRef<EventPayload[]>([]);
  const playingRef = useRef(false);

  function playNext() {
    const next = queueRef.current.shift();
    if (!next) return;
    setData(next);
    setVisible(true);
    playingRef.current = true;
    const text = `${next.nickname} задонатив ${Math.round(next.amount)} гривень. Повідомлення: ${next.message}`;
    const src = `/api/tts?voice=${encodeURIComponent(voiceName)}&text=${encodeURIComponent(text)}`;
    const audio = new Audio(src);
    const finish = () => {
      setVisible(false);
      playingRef.current = false;
      setTimeout(playNext, 2000);
    };
    audio.addEventListener("ended", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
    if (audioAllowedRef.current)
      audio.play().catch((err) => {
        console.error("Failed to play audio", err);
        finish();
      });
    else finish();
  }

  function enqueue(p: EventPayload) {
    queueRef.current.push(p);
    if (!playingRef.current) playNext();
  }

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      setVoiceName(url.searchParams.get("voice") || "");
    } catch (err) {
      console.error("Failed to read voice parameter", err);
    }
  }, []);

  useEffect(() => {
    const enable = () => {
      audioAllowedRef.current = true;
      document.removeEventListener("click", enable);
    };
    document.addEventListener("click", enable);

    let es: EventSource;
    function connect() {
      setConnectionState("connecting");
      es = new EventSource("/api/stream?ts=" + Date.now());
      es.addEventListener("open", () => setConnectionState("connected"));
      es.addEventListener("error", (err) => {
        console.error("EventSource error", err);
        setConnectionState("error");
        es.close();
        setTimeout(connect, 3000);
      });
      es.addEventListener("donation", (ev) => {
        try {
          const p: EventPayload = JSON.parse((ev as MessageEvent).data);
          enqueue(p);
        } catch (err) {
          console.error("Failed to handle donation event", err);
        }
      });
    }
    connect();

    return () => {
      es.close();
      document.removeEventListener("click", enable);
    };
  }, [voiceName]);

  return (
    <div
      className="fixed inset-0 pointer-events-none select-none"
      style={{ background: "transparent" }}
    >
      <div className="absolute top-2 right-3 text-xs">
        {connectionState === "connected" && (
          <span className="text-green-500">Підключено</span>
        )}
        {connectionState === "connecting" && (
          <span className="text-yellow-500">Підключення...</span>
        )}
        {connectionState === "error" && (
          <span className="text-red-500">Немає з'єднання</span>
        )}
      </div>
      {visible && data && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-pop">
          <div
            className="rounded-3xl bg-white/80 text-neutral-900 shadow-2xl backdrop-blur-xl px-6 py-4 min-w-[360px] ring-1 ring-black/5"
            style={{ WebkitBackdropFilter: "blur(16px)" }}
          >
            <div className="text-sm opacity-70 mb-1">Дякуємо за підтримку!</div>
            <div className="text-2xl font-bold">{data.nickname}</div>
            <div className="text-xl mt-1">₴ {Math.round(data.amount)}</div>
            <div className="mt-2 text-sm">{data.message}</div>
          </div>
        </div>
      )}
    </div>
  );
}

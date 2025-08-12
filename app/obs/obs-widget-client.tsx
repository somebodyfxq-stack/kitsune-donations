"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const MotionDiv = dynamic(
  () =>
    import("framer-motion").then((mod) => ({
      default: mod.motion.div,
    })),
  { ssr: false },
);

const AnimatePresence = dynamic(
  () =>
    import("framer-motion").then((mod) => ({
      default: mod.AnimatePresence,
    })),
  { ssr: false },
);

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
      className="pointer-events-none fixed inset-0 select-none"
      style={{ background: "transparent" }}
    >
      <div className="absolute right-3 top-2 text-xs">
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
      <AnimatePresence>
        {visible && data && (
          <MotionDiv
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
          >
            <div className="rounded-3xl bg-gradient-to-r from-primary-500 via-secondary-500 to-brand-500 p-[2px]">
              <div
                className="min-w-[20rem] rounded-3xl bg-white/80 px-6 py-4 text-neutral-900 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl"
                style={{ WebkitBackdropFilter: "blur(16px)" }}
              >
                <div className="mb-1 text-sm opacity-70 sm:text-base">
                  Дякуємо за підтримку!
                </div>
                <div className="text-2xl font-bold sm:text-3xl">
                  {data.nickname}
                </div>
                <div className="mt-1 text-xl sm:text-2xl">
                  ₴ {Math.round(data.amount)}
                </div>
                <div className="mt-2 text-sm sm:text-base">{data.message}</div>
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

interface EventPayload {
  identifier: string;
  nickname: string;
  message: string;
  amount: number;
  createdAt: string;
}

function speak(text: string, voiceName: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  if (voiceName) {
    const v = window.speechSynthesis
      .getVoices()
      .find((x) => x.name.includes(voiceName));
    if (v) u.voice = v;
  }
  window.speechSynthesis.speak(u);
}

export function ObsWidgetClient() {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<EventPayload | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const speechAllowedRef = useRef(false);

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
      speechAllowedRef.current = true;
      document.removeEventListener("click", enable);
    };
    document.addEventListener("click", enable);

    let es: EventSource;
    function connect() {
      es = new EventSource("/api/stream?ts=" + Date.now());
      es.addEventListener("error", (err) => {
        console.error("EventSource error", err);
        es.close();
        setTimeout(connect, 3000);
      });
      es.addEventListener("donation", (ev) => {
        try {
          const p: EventPayload = JSON.parse((ev as MessageEvent).data);
          setData(p);
          setVisible(true);
          const t = `${p.nickname} задонатив ${Math.round(p.amount)} гривень. Повідомлення: ${p.message}`;
          if (speechAllowedRef.current) speak(t, voiceName);
          setTimeout(() => setVisible(false), 8000);
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
     <div className="fixed inset-0 pointer-events-none select-none flex items-center justify-center"
      style={{ background: "transparent" }}
    >
      {visible && data && (
        <div className="animate-pop flex items-center justify-center">
          <div className="rounded-3xl bg-white/80 text-neutral-900 shadow-2xl backdrop-blur-xl px-6 py-4 max-w-[80vw] max-h-[80vh] ring-1 ring-black/5"
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

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

interface ObsWidgetClientProps {
  streamerId?: string;
}

export function ObsWidgetClient({ streamerId }: ObsWidgetClientProps = {}) {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<EventPayload | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [showAudioPrompt, setShowAudioPrompt] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [donationsPaused, setDonationsPaused] = useState(false);
  const audioAllowedRef = useRef(false);
  const queueRef = useRef<EventPayload[]>([]);
  const playingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Функція для перевірки стану паузи
  const checkPauseState = async () => {
    try {
      const response = await fetch('/api/donations/pause');
      if (response.ok) {
        const data = await response.json();
        setDonationsPaused(data.paused);
        console.log("📊 Pause state checked:", data.paused);
      }
    } catch (error) {
      console.error("Failed to check pause state:", error);
    }
  };

  function playNext() {
    console.log("🎬 playNext() called");
    console.log("📊 Current queue length:", queueRef.current.length);
    console.log("⏸️ Donations paused:", donationsPaused);
    
    // Очищаємо таймер, якщо він активний
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Якщо донати призупинені, не відтворюємо наступний
    if (donationsPaused) {
      console.log("⏸️ Donations are paused, not playing next donation");
      playingRef.current = false; // Обов'язково скидаємо стан
      return;
    }
    
    const next = queueRef.current.shift();
    if (!next) {
      console.log("❌ No items in queue, returning");
      playingRef.current = false; // Обов'язково скидаємо стан
      return;
    }
    
    console.log("🎯 Processing donation:", next);
    
    setData(next);
    playingRef.current = true;
    
    const text = `${next.nickname} задонатив ${Math.round(next.amount)} гривень. Повідомлення: ${next.message}`;
    const src = `/api/tts?voice=${encodeURIComponent(voiceName)}&text=${encodeURIComponent(text)}`;
    
    console.log(`🎵 Loading TTS for donation notification:`, {
      nickname: next.nickname,
      amount: next.amount,
      message: next.message,
      text: text,
      audioAllowed: audioAllowedRef.current,
      ttsUrl: src
    });
    
    console.log("🔊 Creating Audio object with URL:", src);
    const audio = new Audio(src);
    
    // Таймаут безпеки - показати сповіщення через 3 секунди навіть якщо TTS не завантажиться
    const safetyTimeout = setTimeout(() => {
      console.log("⏰ Safety timeout - showing notification without waiting for TTS");
      setVisible(true);
    }, 3000);
    
    // Очищаємо таймаут безпеки при успішному завантаженні
    const clearSafetyTimeout = () => {
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
      }
    };
    
    // Розраховуємо приблизну тривалість тексту для українського TTS
    const calculateEstimatedDuration = (text: string): number => {
      // Для українського TTS середня швидкість ~140-160 слів/хвилину
      const words = text.split(/\s+/).filter(word => word.length > 0).length;
      const wordsPerMinute = 150;
      
      // Додаткові паузи для цифр, розділових знаків
      const numbers = (text.match(/\d+/g) || []).length;
      const punctuation = (text.match(/[.,!?;:]/g) || []).length;
      
      // Базова тривалість + додатковий час на цифри та пунктуацію
      const baseDuration = (words / wordsPerMinute) * 60 * 1000;
      const extraTime = (numbers * 500) + (punctuation * 200); // 0.5с на цифру, 0.2с на розділовий знак
      
      return Math.max(2500, baseDuration + extraTime); // мінімум 2.5 секунди
    };
    
    const estimatedDuration = calculateEstimatedDuration(text);
    const displayDuration = estimatedDuration + 1000; // + 1 секунда як запитував користувач
    
    const finish = () => {
      setVisible(false);
      // НЕ скидаємо playingRef.current = false тут, щоб запобігти race condition
      // Очистити попередній таймер якщо він існує
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Перевіряємо стан паузи перед переходом до наступного донату
      timeoutRef.current = setTimeout(() => {
        // Очищаємо таймер та скидаємо стан відтворення
        timeoutRef.current = null;
        playingRef.current = false;
        if (!donationsPaused) {
          playNext();
        } else {
          console.log("⏸️ Donations paused, not starting next donation");
        }
      }, 2000);
    };
    
    let audioStartTime = 0;
    let audioDuration = 0;
    
    audio.addEventListener("loadedmetadata", () => {
      // Отримуємо реальну тривалість аудіо файлу
      audioDuration = audio.duration * 1000; // переводимо в мілісекунди
      console.log(`Audio duration: ${audioDuration}ms, estimated: ${estimatedDuration}ms`);
    });
    
    audio.addEventListener("loadstart", () => {
      console.log(`Loading TTS audio from: ${src}`);
    });
    
    audio.addEventListener("canplay", () => {
      console.log(`✅ TTS audio ready to play - showing notification`);
      clearSafetyTimeout(); // Очищаємо таймаут безпеки
      setVisible(true); // Показуємо сповіщення тільки після завантаження TTS
    });
    
    // Спрощена логіка - завжди спробуємо відтворити аудіо
    let audioPlayPromise: Promise<void> | null = null;
    
    audio.addEventListener("play", () => {
      audioStartTime = Date.now();
      console.log("🎵 TTS audio started playing");
    });
    
    audio.addEventListener("ended", () => {
      const actualPlayTime = Date.now() - audioStartTime;
      const remainingTime = Math.max(1000, displayDuration - actualPlayTime);
      console.log(`🏁 TTS finished, showing notification for ${remainingTime}ms more`);
      setTimeout(finish, remainingTime);
    }, { once: true });
    
    audio.addEventListener("error", (err) => {
      console.error("❌ TTS audio error:", err);
      console.log("🔇 Showing notification without TTS due to audio error");
      clearSafetyTimeout(); // Очищаємо таймаут безпеки
      setVisible(true); // Показуємо сповіщення навіть якщо TTS не завантажиться
      setTimeout(finish, displayDuration);
    }, { once: true });
    
    // Завжди намагаємося відтворити аудіо
    console.log(`▶️ Attempting to play TTS audio. URL: ${src}`);
    
    const attemptPlay = async () => {
      try {
        // Метод 1: Спочатку відтворюємо muted, потім unmute
        audio.muted = true;
        audio.volume = 0.7;
        
        try {
          audioPlayPromise = audio.play();
          await audioPlayPromise;
          console.log("✅ Muted TTS started, now unmuting...");
          
          // Через 100ms unmute
          setTimeout(() => {
            audio.muted = false;
            console.log("🔊 TTS unmuted");
          }, 100);
          
        } catch (mutedErr) {
          console.log("❌ Even muted audio failed:", mutedErr);
          
          // Метод 2: Fallback з тихим звуком
          const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
          silentAudio.volume = 0;
          try {
            await silentAudio.play();
            console.log("🔇 Silent audio activation successful");
            
            // Тепер спробуємо TTS знову
            audio.muted = false;
            audioPlayPromise = audio.play();
            await audioPlayPromise;
            console.log("✅ TTS audio play after silent activation");
          } catch (silentErr) {
            console.log("🔇 Silent audio activation failed:", silentErr);
            // Все одно показуємо сповіщення
            setTimeout(finish, displayDuration);
          }
        }
        
      } catch (err) {
        console.error("❌ TTS audio play promise rejected:", err);
        // Якщо не вдалося відтворити, все одно показуємо сповіщення
        setTimeout(finish, displayDuration);
      }
    };
    
    attemptPlay();
  }

  function enqueue(p: EventPayload) {
    console.log("🔄 Enqueue called with payload:", p);
    queueRef.current.push(p);
    console.log("📝 Queue length after push:", queueRef.current.length);
    console.log("🎮 Current playing state:", playingRef.current);
    console.log("⏱️ Active timeout:", timeoutRef.current ? "Yes" : "No");
    
    // Запускаємо тільки якщо нічого не відтворюється І немає активного таймера
    if (!playingRef.current && !timeoutRef.current) {
      console.log("▶️ Not currently playing and no timeout, calling playNext()");
      playNext();
    } else {
      console.log("⏸️ Already playing or timeout active, donation queued");
    }
  }

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      setVoiceName(url.searchParams.get("voice") || "");
      setDebugMode(url.searchParams.get("debug") === "true");
    } catch (err) {
      console.error("Failed to read voice parameter", err);
    }
  }, []);

  useEffect(() => {
    const enable = () => {
      audioAllowedRef.current = true;
      setShowAudioPrompt(false);
      console.log("Audio playback enabled by user interaction");
      document.removeEventListener("click", enable);
      document.removeEventListener("keydown", enable);
    };
    
    // Спробуємо автоматично дозволити аудіо
    const tryAutoEnable = async () => {
      try {
        // Перевіримо тип пристрою/браузера
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                         window.innerWidth <= 768;
        const isOBS = navigator.userAgent.includes('CEF') || 
                      window.location.pathname.includes('/obs/') ||
                      document.referrer.includes('obs');
        
        if (isMobile || isOBS) {
          // На мобільних пристроях та в OBS просто дозволяємо
          audioAllowedRef.current = true;
          console.log(`Audio automatically enabled (${isMobile ? 'mobile' : 'OBS'} device)`);
          return;
        }
        
                // Для звичайних браузерів - завжди дозволяємо аудіо
        // Оскільки це OBS віджет, користувач не взаємодіє з ним напряму
        
        // Спробуємо активувати AudioContext
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            const audioContext = new AudioContext();
            if (audioContext.state === 'suspended') {
              await audioContext.resume();
              console.log("🎛️ AudioContext resumed");
            }
          }
        } catch (contextErr) {
          console.log("🎛️ AudioContext activation failed:", contextErr);
        }
        
        audioAllowedRef.current = true;
        console.log("Audio force-enabled for OBS widget");
      } catch (err) {
        console.log("Audio setup error:", err);
        // В разі помилки все одно дозволяємо аудіо для OBS
        audioAllowedRef.current = true;
        console.log("Audio force-enabled despite error");
      }
    };
    
    tryAutoEnable();
    
    // Додатковий фоллбек через 2 секунди з програмним кліком
    setTimeout(() => {
      if (!audioAllowedRef.current) {
        console.log("🔊 Fallback: Creating programmatic click event");
        
        // Створюємо програмний клік
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        
        // Створюємо тимчасовий елемент для кліку
        const tempButton = document.createElement('button');
        tempButton.style.position = 'absolute';
        tempButton.style.top = '-1000px';
        tempButton.style.left = '-1000px';
        tempButton.style.width = '1px';
        tempButton.style.height = '1px';
        tempButton.style.opacity = '0';
        
        tempButton.addEventListener('click', async () => {
          console.log("🎯 Programmatic click event triggered");
          try {
            const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
            silentAudio.volume = 0;
            await silentAudio.play();
            audioAllowedRef.current = true;
            setShowAudioPrompt(false);
            console.log("✅ Programmatic audio activation successful");
          } catch (err) {
            console.log("❌ Programmatic audio activation failed:", err);
            audioAllowedRef.current = true;
          }
          document.body.removeChild(tempButton);
        });
        
        document.body.appendChild(tempButton);
        tempButton.dispatchEvent(clickEvent);
      }
    }, 2000);

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
        // Очистити попередній reconnect таймер
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      });
      es.addEventListener("donation", (ev) => {
        try {
          console.log("🎯 Received donation event:", (ev as MessageEvent).data);
          const p: EventPayload = JSON.parse((ev as MessageEvent).data);
          console.log("📦 Parsed donation payload:", p);
          console.log("🎵 About to enqueue donation, current playing state:", playingRef.current);
          enqueue(p);
        } catch (err) {
          console.error("❌ Failed to handle donation event", err);
        }
      });
    }
    connect();

    return () => {
      es.close();
      document.removeEventListener("click", enable);
      // Очистити активні таймери при unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [voiceName, streamerId]);

  // Періодично перевіряємо стан паузи та відновлюємо чергу при потребі
  useEffect(() => {
    // Перевірка стану паузи при завантаженні
    checkPauseState();

    // Налаштовуємо періодичну перевірку кожні 3 секунди
    pauseCheckRef.current = setInterval(checkPauseState, 3000);

    return () => {
      if (pauseCheckRef.current) {
        clearInterval(pauseCheckRef.current);
        pauseCheckRef.current = null;
      }
    };
  }, []);

  // Відновлюємо чергу коли донати розпаузені
  useEffect(() => {
    // Якщо донати були розпаузені і є черга, але нічого не відтворюється - запускаємо чергу
    if (!donationsPaused && !playingRef.current && !timeoutRef.current && queueRef.current.length > 0) {
      console.log("▶️ Donations unpaused, resuming queue with", queueRef.current.length, "items");
      playNext();
    }
  }, [donationsPaused]);

  return (
    <div
      className="pointer-events-none fixed inset-0 select-none"
      style={{ background: "transparent" }}
      suppressHydrationWarning={true}
    >
      {/* Невидима кнопка для активації аудіо - автоматично натискається через 1 секунду */}
      <button
        ref={(btn) => {
          if (btn && !audioAllowedRef.current) {
            setTimeout(() => {
              console.log("🎯 Auto-clicking invisible button to activate audio");
              btn.click();
            }, 1000);
          }
        }}
        onClick={async () => {
          console.log("🔊 Invisible button clicked - activating audio");
          try {
            // Відтворюємо тихий звук для активації аудіо контексту
            const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
            silentAudio.volume = 0;
            await silentAudio.play();
            
            // Активуємо AudioContext
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
              const audioContext = new AudioContext();
              if (audioContext.state === 'suspended') {
                await audioContext.resume();
                console.log("🎛️ AudioContext resumed via button click");
              }
            }
            
            audioAllowedRef.current = true;
            setShowAudioPrompt(false);
            console.log("✅ Audio activated successfully via invisible button");
          } catch (err) {
            console.error("❌ Audio activation failed:", err);
            audioAllowedRef.current = true; // Все одно дозволяємо спробувати
          }
        }}
        className="absolute top-0 left-0 w-1 h-1 opacity-0 pointer-events-auto"
        style={{ zIndex: -1 }}
        aria-hidden="true"
      >
        Audio Activation
      </button>
      {/* Кнопки для налагодження */}
      {showAudioPrompt && (
        <div className="pointer-events-auto fixed top-4 right-4 z-50 space-y-2">
          <button
            onClick={() => {
              audioAllowedRef.current = true;
              setShowAudioPrompt(false);
              console.log("Audio enabled by button click");
            }}
            className="block w-full rounded-lg bg-blue-500 px-4 py-2 text-white shadow-lg hover:bg-blue-600 transition-colors"
          >
            🔊 Увімкнути звук
          </button>
          
          <button
            onClick={async () => {
              console.log("🧪 Testing TTS directly...");
              try {
                const testAudio = new Audio("/api/tts?text=тест&voice=uk-UA-Standard-A");
                testAudio.volume = 0.5;
                
                testAudio.addEventListener("loadstart", () => console.log("🔄 Test audio loading..."));
                testAudio.addEventListener("canplay", () => console.log("▶️ Test audio ready"));
                testAudio.addEventListener("play", () => console.log("🎵 Test audio playing"));
                testAudio.addEventListener("error", (e) => console.error("❌ Test audio error:", e));
                
                await testAudio.play();
                console.log("✅ Test TTS played successfully");
              } catch (err) {
                console.error("❌ Test TTS failed:", err);
              }
            }}
            className="block w-full rounded-lg bg-purple-500 px-4 py-2 text-white shadow-lg hover:bg-purple-600 transition-colors"
          >
            🧪 Тест TTS
          </button>
        </div>
      )}

      {/* Діагностична інформація */}
      {debugMode && (
        <div className="pointer-events-auto fixed top-4 left-4 z-50 bg-black/80 text-white p-4 rounded text-sm max-w-xs">
          <div><strong>Debug Info:</strong></div>
          <div>Audio Allowed: {audioAllowedRef.current ? "✅" : "❌"}</div>
          <div>Connection: {connectionState}</div>
          <div>Voice: {voiceName}</div>
          <div>Queue: {queueRef.current.length}</div>
          <div>Playing: {playingRef.current ? "Yes" : "No"}</div>
          <div>Visible: {visible ? "Yes" : "No"}</div>
          <div>Show Audio Prompt: {showAudioPrompt ? "Yes" : "No"}</div>
          
          <div className="mt-2 space-y-1">
            <button
              onClick={() => {
                console.log("🧪 Manual TTS test from debug panel");
                const testAudio = new Audio("/api/tts?text=тест%20з%20дебаг%20панелі&voice=uk-UA-Standard-A");
                testAudio.volume = 0.7;
                testAudio.addEventListener("loadstart", () => console.log("🔄 Test loading..."));
                testAudio.addEventListener("canplay", () => console.log("▶️ Test can play"));
                testAudio.addEventListener("play", () => console.log("🎵 Test playing"));
                testAudio.addEventListener("error", (e) => console.error("❌ Test error:", e));
                testAudio.play()
                  .then(() => console.log("✅ Manual TTS test successful"))
                  .catch(err => console.error("❌ Manual TTS test failed:", err));
              }}
              className="block w-full bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-xs"
            >
              🧪 Manual TTS Test
            </button>
            
            <button
              onClick={() => {
                console.log("🎯 Simulating donation manually");
                const fakeDonation: EventPayload = {
                  identifier: "manual-test-" + Date.now(),
                  nickname: "TestUser",
                  message: "Manual test message",
                  amount: 100,
                  createdAt: new Date().toISOString()
                };
                console.log("📦 Fake donation payload:", fakeDonation);
                enqueue(fakeDonation);
              }}
              className="block w-full bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs"
            >
              🎯 Simulate Donation
            </button>
          </div>
        </div>
      )}

      {visible && data && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-donation-appear">
          <div
            className="min-w-[720px] rounded-3xl bg-white/80 px-12 py-8 text-neutral-900 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl"
            style={{ 
              WebkitBackdropFilter: "blur(16px)",
              transform: "scale(2.0)",
              transformOrigin: "center"
            }}
          >
            <div className="mb-2 text-sm opacity-70">Дякуємо за підтримку!</div>
            <div className="text-2xl font-bold">{data.nickname}</div>
            <div className="mt-2 text-xl">₴ {Math.round(data.amount)}</div>
            <div className="mt-4 text-sm">{data.message}</div>
          </div>
        </div>
      )}
    </div>
  );
}

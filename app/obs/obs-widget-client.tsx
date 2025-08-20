"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  const checkPauseState = useCallback(async () => {
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
  }, []);

  const playNext = useCallback(() => {
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
    
    const text = `${next.nickname} задонатив ${Math.round(next.amount)} гривень... ${next.message}`;
    const src = `/api/tts?voice=${encodeURIComponent(voiceName)}&text=${encodeURIComponent(text)}&quality=optimal`;
    
    console.log(`🎵 Loading TTS for donation notification:`, {
      nickname: next.nickname,
      amount: next.amount,
      message: next.message,
      text: text,
      audioAllowed: audioAllowedRef.current,
      ttsUrl: src
    });
    
    console.log("🔊 Creating Audio object with URL:", src);
    const audio = new Audio();
    audio.preload = 'auto'; // Повна попередня буферизація
    audio.crossOrigin = 'anonymous'; // Для коректної роботи CORS
    audio.volume = 0.01; // Починаємо з дуже тихої гучності для fade-in ефекту
    
    // Налаштування для кращої якості звуку та запобігання потріскуванню
    if ('mozCurrentSampleOffset' in audio) {
      // Firefox specific optimizations
      (audio as any).mozAudioChannelType = 'content';
    }
    
    // Додаткові налаштування для плавного відтворення
    if ('webkitAudioContext' in window || 'AudioContext' in window) {
      audio.preservesPitch = false; // Може зменшити артефакти
      // Встановлюємо буферизацію для кращої стабільності
      if ('setPlaybackRate' in audio) {
        (audio as any).mozPreservesPitch = false;
      }
    }
    
    audio.src = src;
    
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
    
    audio.addEventListener("canplaythrough", () => {
      console.log(`✅ TTS audio fully buffered - preparing for smooth playback`);
      clearSafetyTimeout(); // Очищаємо таймаут безпеки
      
      // Невелика затримка перед показом для стабілізації аудіо контексту
      setTimeout(() => {
        setVisible(true); // Показуємо сповіщення після стабілізації
      }, 50);
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
        // Активуємо AudioContext спочатку для кращої стабільності
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            const audioContext = new AudioContext();
            if (audioContext.state === 'suspended') {
              await audioContext.resume();
              console.log("🎛️ AudioContext активовано перед відтворенням");
            }
          }
        } catch (contextErr) {
          console.log("🎛️ AudioContext activation warning:", contextErr);
        }
        
        // Почати з дуже тихої гучності для плавного fade-in
        audio.volume = 0.01;
        audio.muted = false;
        
        try {
          console.log("▶️ Starting TTS playback with fade-in...");
          audioPlayPromise = audio.play();
          await audioPlayPromise;
          
          // Плавно збільшуємо гучність протягом 200ms
          let currentVolume = 0.01;
          const targetVolume = 0.7;
          const fadeSteps = 10;
          const stepSize = (targetVolume - currentVolume) / fadeSteps;
          const stepInterval = 20; // 20ms на крок = 200ms загалом
          
          const fadeInterval = setInterval(() => {
            currentVolume += stepSize;
            if (currentVolume >= targetVolume) {
              audio.volume = targetVolume;
              clearInterval(fadeInterval);
              console.log("🔊 TTS fade-in завершено");
            } else {
              audio.volume = currentVolume;
            }
          }, stepInterval);
          
        } catch (directPlayErr) {
          console.log("❌ Direct play failed, trying fallback:", directPlayErr);
          
          // Метод fallback з тихим звуком для активації
          const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
          silentAudio.volume = 0;
          try {
            await silentAudio.play();
            console.log("🔇 Silent audio activation successful");
            
            // Затримка для стабілізації перед спробою TTS
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Спробуємо TTS знову з fade-in
            audio.volume = 0.01;
            audioPlayPromise = audio.play();
            await audioPlayPromise;
            
            // Плавний fade-in після fallback
            setTimeout(() => {
              let vol = 0.01;
              const fadeUp = setInterval(() => {
                vol += 0.07;
                if (vol >= 0.7) {
                  audio.volume = 0.7;
                  clearInterval(fadeUp);
                } else {
                  audio.volume = vol;
                }
              }, 20);
            }, 50);
            
            console.log("✅ TTS audio play after silent activation with fade-in");
          } catch (silentErr) {
            console.log("🔇 All audio activation methods failed:", silentErr);
            // Показуємо сповіщення без звуку
            setTimeout(finish, displayDuration);
          }
        }
        
      } catch (err) {
        console.error("❌ TTS audio play promise rejected:", err);
        // Якщо не вдалося відтворити, все одно показуємо сповіщення
        setTimeout(finish, displayDuration);
      }
    };
    
    // Невелика затримка для стабілізації аудіо об'єкту після налаштування всіх listeners
    setTimeout(() => {
      attemptPlay();
    }, 150);
  }, [donationsPaused, voiceName]);

  const enqueue = useCallback((p: EventPayload) => {
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
  }, [playNext]);

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

      // Не обробляємо YouTube події в звичайному віджеті
      es.addEventListener("youtube-video", (ev) => {
        console.log("🎬 YouTube video event received in donation widget - ignoring");
        // YouTube відео обробляються окремо у YouTube віджеті
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
  }, [voiceName, streamerId, enqueue]);

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
  }, [checkPauseState]);

  // Відновлюємо чергу коли донати розпаузені
  useEffect(() => {
    // Якщо донати були розпаузені і є черга, але нічого не відтворюється - запускаємо чергу
    if (!donationsPaused && !playingRef.current && !timeoutRef.current && queueRef.current.length > 0) {
      console.log("▶️ Donations unpaused, resuming queue with", queueRef.current.length, "items");
      playNext();
    }
  }, [donationsPaused, playNext]);

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
                const testAudio = new Audio("/api/tts?text=тест%20LINEAR16%2048kHz&voice=uk-UA-Standard-A&quality=optimal");
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
            <div className="text-xs text-gray-300 mb-1">🎵 TTS Quality Tests (LINEAR16 48kHz):</div>
            
            {["optimal", "high", "fast"].map((quality) => (
              <button
                key={quality}
                onClick={() => {
                  console.log(`🧪 Testing TTS quality: ${quality}`);
                  const qualityText = quality === "optimal" ? "оптимальна LINEAR16 48kHz" : 
                                    quality === "high" ? "максимальна LINEAR16 48kHz" : 
                                    "швидка MP3 16kHz";
                  const testAudio = new Audio(`/api/tts?text=${encodeURIComponent(`Тест ${qualityText} звуку`)}&voice=uk-UA-Standard-A&quality=${quality}`);
                  testAudio.volume = 0.7;
                  testAudio.addEventListener("loadstart", () => console.log(`🔄 ${quality} loading...`));
                  testAudio.addEventListener("canplay", () => console.log(`▶️ ${quality} can play`));
                  testAudio.addEventListener("play", () => console.log(`🎵 ${quality} playing`));
                  testAudio.addEventListener("error", (e) => console.error(`❌ ${quality} error:`, e));
                  testAudio.play()
                    .then(() => console.log(`✅ ${quality} TTS test successful`))
                    .catch(err => console.error(`❌ ${quality} TTS test failed:`, err));
                }}
                className={`block w-full px-2 py-1 rounded text-xs mb-1 ${
                  quality === "optimal" ? "bg-green-600 hover:bg-green-700" :
                  quality === "high" ? "bg-blue-600 hover:bg-blue-700" :
                  "bg-orange-600 hover:bg-orange-700"
                }`}
              >
                {quality === "optimal" && "🎯 Optimal (LINEAR16 48kHz)"}
                {quality === "high" && "🏆 High (LINEAR16 48kHz)"}
                {quality === "fast" && "⚡ Fast (MP3 16kHz)"}
              </button>
            ))}
            
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

      {/* Базове донатне сповіщення - GitHub Repository State */}
      {visible && data && (
        <div className="fixed inset-0 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
            
            {/* Нікнейм */}
            <div className="text-center mb-4">
              <h3 className="text-2xl font-bold text-gray-800">
                {data.nickname}
              </h3>
            </div>

            {/* Повідомлення */}
            <div className="text-center mb-6">
              <p className="text-gray-600 text-lg leading-relaxed">
                {data.message.length > 200 ? data.message.substring(0, 200) + '...' : data.message}
              </p>
            </div>

            {/* Сума */}
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">
                {Math.round(data.amount)}₴
              </div>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
